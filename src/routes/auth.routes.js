import { Router } from "express";
import {
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
} from "../controllers/authUser.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  userChangeCurrentPasswordValidator,
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// public routes (no JWT required)
router
  .route("/register")
  .post(registerLimiter, userRegisterValidator(), validate, registerUser);
router
  .route("/login")
  .post(loginLimiter, userLoginValidator(), validate, login);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshTokenLimiter, refreshAccessToken);
router
  .route("/forgot-password")
  .post(
    forgotPasswordLimiter,
    userForgotPasswordValidator(),
    validate,
    forgotPasswordRequest,
  );
router
  .route("/reset-password/:resetToken")
  .post(userResetForgotPasswordValidator(), validate, resetForgotPassword);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/change-password")
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword,
  );
router
  .route("/resend-email-verification")
  .post(verifyJWT, resendVerificationLimiter, resendEmailVerification);

export default router;
