import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name must be at most 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

// A user can't have two projects with the same name (case-insensitive),
// but different users can reuse the same name.
projectSchema.index(
  { createdBy: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const Project = mongoose.model("Project", projectSchema);
