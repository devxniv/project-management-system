import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ProjectMember } from "../models/projectmember.models.js";
export const verifyJWT = asyncHandler(async (req, resizeBy, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );
    if (!user) {
      throw new ApiError(401, "Invallid access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invallid access token");
  }
});

//Role-Based Access Control middleware
export const validateProjectPermission = (roles = []) => {
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "project id is missing");
    }

    //project member document
    const project = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!project) {
      throw new ApiError(400, "project not found");
    }

    const givenRole = project?.role;

    //attach the "givenRole' to "req.user.role" so that subsequent functions know exactly what the user's permissions are.
    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      throw new ApiError(
        403,
        "you do not have permission to perform this action",
      );
    }
    next();
  });
};
