import { ApiError } from "../utils/apiError.js";
import fs from "fs/promises";

const cleanupUploadedFiles = (req) => {
  const files = [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(req.files) ? req.files : []),
  ];
  return Promise.all(
    files.map((f) => (f.path ? fs.unlink(f.path).catch(() => {}) : null)),
  );
};
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Express recognises an error handler by its 4 arguments, so keep `next`
const errorHandler = (err, req, res, next) => {
  void cleanupUploadedFiles(req);
  if (res.headersSent) return next(err);

  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = 500;
    let message = "Internal server error";
    let errors = [];
    const status = err.statusCode || err.status;

    if (err.name === "ValidationError" && err.errors) {
      // Mongoose schema validation
      statusCode = 400;
      message = "Validation failed";
      errors = Object.values(err.errors).map((e) => e.message);
    } else if (err.name === "CastError") {
      // Invalid ObjectId etc.
      statusCode = 400;
      message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
      // Duplicate key
      statusCode = 409;
      message = `Already exists: ${Object.keys(err.keyValue || {}).join(", ")}`;
    } else if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token has expired";
    } else if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    } else if (err.name === "MulterError") {
      statusCode = 400;
      message = err.message;
    } else if (err.type === "entity.parse.failed") {
      statusCode = 400;
      message = "Invalid JSON in request body";
    } else if (status && status < 500) {
      statusCode = status;
      message = err.message;
    }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  if (error.statusCode >= 500) console.error(err);

  const isProd = process.env.NODE_ENV === "production";

  return res.status(error.statusCode).json({
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors,
    ...(!isProd && { stack: error.stack }),
  });
};

export { notFoundHandler, errorHandler };
