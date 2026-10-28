import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // one message per field, e.g. [{ email: "Email is invalid" }]
  const extractedErrors = errors
    .array({ onlyFirstError: true })
    .map((err) => ({ [err.path]: err.msg }));

  throw new ApiError(422, "Received data is not valid", extractedErrors);
};
