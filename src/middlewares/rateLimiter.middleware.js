import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiError.js";

// Every limiter returns your app's standard error shape instead of plain text
const rateLimitHandler = (req, res, next, options) => {
  next(
    new ApiError(
      429,
      typeof options.message === "string"
        ? options.message
        : "Too many requests, please try again later.",
    ),
  );
};

const base = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  standardHeaders: true, // adds RateLimit-* response headers
  legacyHeaders: false,
  handler: rateLimitHandler,
};

// Whole API: a generous safety net
const apiLimiter = rateLimit({
  ...base,
  limit: 300,
  message: "Too many requests. Please slow down.",
});

// Brute-force protection: only failed logins count against the limit
const loginLimiter = rateLimit({
  ...base,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

const registerLimiter = rateLimit({
  ...base,
  limit: 10,
  message: "Too many sign-up attempts. Please try again later.",
});

// Password-reset / email spam protection
const forgotPasswordLimiter = rateLimit({
  ...base,
  limit: 5,
  message: "Too many password reset requests. Please try again later.",
});

const resendVerificationLimiter = rateLimit({
  ...base,
  limit: 5,
  message: "Too many verification emails requested. Please try again later.",
});

// Looser, since clients refresh routinely as access tokens expire
const refreshTokenLimiter = rateLimit({
  ...base,
  limit: 30,
  message: "Too many token refresh attempts. Please try again later.",
});

export {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  refreshTokenLimiter,
};
