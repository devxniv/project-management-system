import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const UPLOAD_DIR = path.join(process.cwd(), "public", "img");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The extension comes from the checked mimetype, never from the user's filename
const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const ATTACHMENT_TYPES = { ...IMAGE_TYPES, "application/pdf": ".pdf" };

const createUploader = (allowedTypes, { maxFileSize, maxFiles }) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => {
        const random = crypto.randomBytes(8).toString("hex");
        cb(null, `${Date.now()}-${random}${allowedTypes[file.mimetype]}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (allowedTypes[file.mimetype]) return cb(null, true);
      cb(
        new ApiError(
          400,
          `Unsupported file type. Allowed: ${Object.keys(allowedTypes).join(", ")}`,
        ),
      );
    },
    limits: { fileSize: maxFileSize, files: maxFiles },
  });

// avatars: one image, max 1 MB
export const uploadImage = createUploader(IMAGE_TYPES, {
  maxFileSize: 1 * 1000 * 1000,
  maxFiles: 1,
});

// general attachments (images + PDF): up to 5 files, max 5 MB each
export const upload = createUploader(ATTACHMENT_TYPES, {
  maxFileSize: 5 * 1000 * 1000,
  maxFiles: 5,
});
