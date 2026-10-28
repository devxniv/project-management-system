import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatuses, TaskStatusEnum } from "../utils/constants.js";

const MAX_ATTACHMENTS = 5;

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [150, "Task title must be at most 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be at most 2000 characters"],
      default: "",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      immutable: true, // a task never moves between projects
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatuses,
      default: TaskStatusEnum.TODO,
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          localPath: String, // lets us delete the file from disk later
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
      validate: {
        validator: (arr) => arr.length <= MAX_ATTACHMENTS,
        message: `A task can have at most ${MAX_ATTACHMENTS} attachments`,
      },
    },
  },
  { timestamps: true },
);

// "tasks in a project" (newest first, optionally filtered by status)
taskSchema.index({ project: 1, status: 1, createdAt: -1 });
// "tasks assigned to a user"
taskSchema.index({ assignedTo: 1 });

export const Task = mongoose.model("Task", taskSchema);
