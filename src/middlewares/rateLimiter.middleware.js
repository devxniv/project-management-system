import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiError.js";

// Shared handler so every limiter returns your app's standard error shape
// instead of express-rate-limit's plain text default.
const rateLimitHandler = (req, res, next, options) => {
  throw new ApiError(
    429,
    options.message || "Too many requests, please try again later.",
  );
};

// Strict — brute-force login protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP per window
  standardHeaders: true, // adds RateLimit-* response headers
  legacyHeaders: false,
  message: "Too many login attempts. Please try again in 15 minutes.",
  handler: rateLimitHandler,
});

// Password reset spam protection
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many password reset requests. Please try again later.",
  handler: rateLimitHandler,
});

// Refresh token abuse protection — looser, since legitimate clients
// call this routinely as access tokens expire
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many token refresh attempts. Please try again later.",
  handler: rateLimitHandler,
});

export { loginLimiter, forgotPasswordLimiter, refreshTokenLimiter };
