import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";

const getAccessToken = (req) => {
  const cookieToken = req.cookies?.accessToken;
  if (typeof cookieToken === "string" && cookieToken) return cookieToken;

  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();

  return null;
};

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = getAccessToken(req);
  if (!token) throw new ApiError(401, "unauthorized request");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(decoded?._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );
  if (!user) throw new ApiError(401, "Invalid access token");

  req.user = user;
  next();
});

// Role-Based Access Control middleware
export const validateProjectPermission = (roles = []) =>
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!mongoose.isObjectIdOrHexString(projectId)) {
      throw new ApiError(400, "invalid project id");
    }

    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
    });

    // 404 (not 403) so non-members can't discover which projects exist
    if (!membership) throw new ApiError(404, "project not found");

    if (roles.length && !roles.includes(membership.role)) {
      throw new ApiError(
        403,
        "you do not have permission to perform this action",
      );
    }

    req.projectRole = membership.role;
    next();
  });
