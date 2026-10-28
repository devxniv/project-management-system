import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mailgen.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/constants.js";

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // keep in sync with ACCESS_TOKEN_EXPIRY
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // keep in sync with REFRESH_TOKEN_EXPIRY
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

// ---------- helpers ----------

// Only plain strings are accepted; this blocks NoSQL injection like { "$ne": null }
const cleanString = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value) => cleanString(value).toLowerCase();
const normalizeUsername = (value) => cleanString(value).toLowerCase();

// Built from env, never from the request Host header (host-header poisoning)
const getBaseUrl = () =>
  (
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 8000}`
  ).replace(/\/+$/, "");

const verificationLink = (token) =>
  `${getBaseUrl()}/api/v1/auth/verify-email/${token}`;

const passwordResetLink = (token) =>
  `${(process.env.FORGOT_PASSWORD_REDIRECT_URL || "").replace(/\/+$/, "")}/${token}`;

// Takes the user document you already have (no extra DB query)
const generateAccessAndRefreshTokens = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // store only the hash
    user.refreshToken = User.hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation failed:", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const setAuthCookies = (res, accessToken, refreshToken) =>
  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_COOKIE_MAX_AGE,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

// ---------- controllers ----------

const registerUser = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = cleanString(body.fullName) || undefined;

  if (!email || !username || !password) {
    throw new ApiError(400, "email, username and password are required");
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new ApiError(409, "user with this email or username already exists");
  }

  const user = new User({
    email,
    username,
    password,
    fullName,
    isEmailVerified: false,
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(VERIFY_TTL_MS);
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  try {
    await user.save(); // full validation: password length, email format, etc.
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(
        409,
        "user with this email or username already exists",
      );
    }
    throw err; // ValidationError is turned into a 400 by the error middleware
  }

  let emailSent = true;
  try {
    await sendEmail({
      email: user.email,
      subject: "please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        verificationLink(unHashedToken),
      ),
    });
  } catch (err) {
    emailSent = false;
    console.error("Verification email failed:", err.message);
  }

  // toJSON() strips password and tokens, so the saved document is safe to return
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user },
        emailSent
          ? "User registered successfully and verification email has been sent"
          : "User registered, but the verification email could not be sent. Please log in and request a new one.",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  // same message for unknown email and wrong password
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  return setAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(new ApiResponse(200, { user }, "user logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const verificationToken = cleanString(req.params?.verificationToken);

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }

  const user = await User.findOne({
    emailVerificationToken: User.hashToken(verificationToken),
    emailVerificationExpiry: { $gt: Date.now() },
  }).select("+emailVerificationToken +emailVerificationExpiry");

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(VERIFY_TTL_MS);
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      verificationLink(unHashedToken),
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken || typeof incomingRefreshToken !== "string") {
    throw new ApiError(401, "Unauthorized access");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded?._id).select("+refreshToken");
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (
    !user.refreshToken ||
    User.hashToken(incomingRefreshToken) !== user.refreshToken
  ) {
    // a valid token that is not the current one means it was reused: revoke the session
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, "Refresh token is invalid or already used");
  }

  // generates a new pair and stores the new hash
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshTokens(user);

  return setAuthCookies(res, accessToken, newRefreshToken)
    .status(200)
    .json(new ApiResponse(200, {}, "Access token refreshed"));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  // identical response whether or not the account exists (or the mail fails)
  const genericResponse = new ApiResponse(
    200,
    {},
    "If an account exists for this email, a password reset mail has been sent",
  );

  if (!email) {
    throw new ApiError(400, "email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "password reset request",
      mailgenContent: forgotPasswordMailgenContent(
        user.username,
        passwordResetLink(unHashedToken),
      ),
    });
  } catch (err) {
    // do not reveal to the caller that this account exists
    console.error("Password reset email failed:", err.message);
  }

  return res.status(200).json(genericResponse);
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const resetToken = cleanString(req.params?.resetToken);
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!resetToken || !newPassword) {
    throw new ApiError(400, "reset token and new password are required");
  }

  const user = await User.findOne({
    forgotPasswordToken: User.hashToken(resetToken),
    forgotPasswordExpiry: { $gt: Date.now() },
  }).select("+forgotPasswordToken +forgotPasswordExpiry +refreshToken");

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.refreshToken = undefined; // log out every existing session
  user.password = newPassword; // hashed by the pre-save hook
  await user.save(); // full validation so the password rules apply

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const oldPassword =
    typeof req.body?.oldPassword === "string" ? req.body.oldPassword : "";
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "old password and new password are required");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the old one");
  }

  const user = await User.findById(req.user?._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save(); // full validation so the password rules apply

  // new token pair: invalidates other sessions, keeps this device logged in
  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user);

  return setAuthCookies(res, accessToken, refreshToken)
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  changeCurrentPassword,
  resetForgotPassword,
  forgotPasswordRequest,
};
