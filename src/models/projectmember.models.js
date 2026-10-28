import mongoose, { Schema } from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRolesEnum.MEMBER,
    },
  },
  { timestamps: true },
);

// One membership per user per project; also serves "members of a project" and
// the permission-middleware lookup
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
// serves "all projects of a user"
projectMemberSchema.index({ user: 1 });

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
