import mongoose, { Schema } from "mongoose";

const subTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Subtask title is required"],
      trim: true,
      maxlength: [150, "Subtask title must be at most 150 characters"],
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      immutable: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
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

subTaskSchema.index({ task: 1, createdAt: 1 });

export const Subtask = mongoose.model("Subtask", subTaskSchema);
