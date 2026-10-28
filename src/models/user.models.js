import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env variable: ${name}`);
  return value;
};

const userSchema = new Schema(
  {
    avatar: {
      url: {
        type: String,
        default: "https://placehold.co/200x200",
      },
      localPath: {
        type: String,
        default: "",
      },
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Full name must be at most 100 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // stored as a SHA-256 hash, never the raw token
    refreshToken: {
      type: String,
      select: false,
    },
    forgotPasswordToken: {
      type: String,
      select: false,
    },
    forgotPasswordExpiry: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // select:false does not protect documents already in memory (create/save),
      // so strip secrets whenever a user is serialized
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.forgotPasswordToken;
        delete ret.forgotPasswordExpiry;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpiry;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Hash password on save() / create(). Does NOT run on findByIdAndUpdate / updateOne,
// so always change passwords with `user.password = x; await user.save()`.
// Note: minlength validates the plain password before this hook hashes it.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

// The document must be loaded with .select("+password")
userSchema.methods.isPasswordCorrect = async function (password) {
  if (!password || !this.password) return false;
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ _id: this._id }, requireEnv("ACCESS_TOKEN_SECRET"), {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, requireEnv("REFRESH_TOKEN_SECRET"), {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
};

// Hash a refresh token before storing or comparing it
userSchema.statics.hashToken = sha256;

// Temporary tokens for email verification / password reset.
// Email the unHashedToken; store only the hashedToken.
userSchema.methods.generateTemporaryToken = function (ttlMs = 20 * 60 * 1000) {
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = sha256(unHashedToken);
  const tokenExpiry = Date.now() + ttlMs;
  return { unHashedToken, hashedToken, tokenExpiry };
};

export const User = mongoose.model("User", userSchema);
