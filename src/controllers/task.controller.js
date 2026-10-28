import mongoose from "mongoose";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserRolesEnum, AvailableTaskStatuses } from "../utils/constants.js";
import fs from "fs/promises";
import path from "path";

const MAX_ATTACHMENTS = 5;

const buildAttachments = (files = []) =>
  files.map((f) => ({
    url: `${(process.env.SERVER_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/+$/, "")}/img/${f.filename}`,
    localPath: path.join("public", "img", f.filename),
    mimetype: f.mimetype,
    size: f.size,
  }));

const removeAttachmentFiles = (attachments = []) =>
  Promise.all(
    attachments.map((a) =>
      a.localPath
        ? fs.unlink(path.join(process.cwd(), a.localPath)).catch(() => {})
        : null,
    ),
  );
const { ADMIN, PROJECT_ADMIN } = UserRolesEnum;

const USER_FIELDS = "username fullName avatar.url";
const canManageTasks = (role) => role === ADMIN || role === PROJECT_ADMIN;
const isSameId = (a, b) => Boolean(a) && Boolean(b) && String(a) === String(b);

// ---------- helpers ----------

const assertIsProjectMember = async (projectId, userId) => {
  const member = await ProjectMember.exists({
    project: projectId,
    user: userId,
  });
  if (!member) {
    throw new ApiError(400, "Assigned user is not a member of this project");
  }
};

// Always look tasks up together with their project, so a member of one
// project can never touch a task that belongs to another
const findTaskInProject = async (taskId, projectId) => {
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found");
  return task;
};

const findSubtaskInProject = async (subTaskId, projectId) => {
  const subtask = await Subtask.findById(subTaskId);
  if (!subtask) throw new ApiError(404, "Subtask not found");

  const task = await Task.findOne({ _id: subtask.task, project: projectId });
  if (!task) throw new ApiError(404, "Subtask not found");

  return { subtask, task };
};

const populateTask = (task) =>
  task.populate([
    { path: "assignedTo", select: USER_FIELDS },
    { path: "assignedBy", select: USER_FIELDS },
  ]);

// ---------- tasks ----------

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, assignedTo } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { project: projectId };

  if (status !== undefined) {
    if (typeof status !== "string" || !AvailableTaskStatuses.includes(status)) {
      throw new ApiError(
        400,
        `status must be one of: ${AvailableTaskStatuses.join(", ")}`,
      );
    }
    filter.status = status;
  }

  if (assignedTo !== undefined) {
    const assigneeId = assignedTo === "me" ? req.user._id : assignedTo;
    if (!mongoose.isObjectIdOrHexString(assigneeId)) {
      throw new ApiError(400, "assignedTo must be a user id or 'me'");
    }
    filter.assignedTo = assigneeId;
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo", USER_FIELDS)
      .populate("assignedBy", USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tasks, page, limit, total, totalPages: Math.ceil(total / limit) },
        "Tasks fetched successfully",
      ),
    );
});

const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate("assignedTo", USER_FIELDS)
    .populate("assignedBy", USER_FIELDS)
    .lean();
  if (!task) throw new ApiError(404, "Task not found");

  const subtasks = await Subtask.find({ task: taskId })
    .sort({ createdAt: 1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { ...task, subtasks }, "Task fetched successfully"),
    );
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status } = req.body ?? {};

  if (assignedTo) await assertIsProjectMember(projectId, assignedTo);

  const task = await Task.create({
    title,
    description,
    status,
    project: projectId,
    assignedTo: assignedTo || undefined,
    assignedBy: assignedTo ? req.user._id : undefined,
    attachments: buildAttachments(req.files),
  });

  await populateTask(task);

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title, description, assignedTo, status } = req.body ?? {};
  const newFiles = req.files ?? [];

  if (
    [title, description, assignedTo, status].every((v) => v === undefined) &&
    newFiles.length === 0
  ) {
    throw new ApiError(400, "Provide at least one field or file to update");
  }

  const task = await findTaskInProject(taskId, projectId);

  if (task.attachments.length + newFiles.length > MAX_ATTACHMENTS) {
    throw new ApiError(
      400,
      `A task can have at most ${MAX_ATTACHMENTS} attachments`,
    );
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;

  if (assignedTo !== undefined) {
    if (assignedTo === null) {
      task.assignedTo = undefined;
      task.assignedBy = undefined;
    } else if (!isSameId(task.assignedTo, assignedTo)) {
      await assertIsProjectMember(projectId, assignedTo);
      task.assignedTo = assignedTo;
      task.assignedBy = req.user._id;
    }
  }

  task.attachments.push(...buildAttachments(newFiles));

  await task.save();
  await populateTask(task);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

// Assignee, admin or project admin can move a task between statuses
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { status } = req.body ?? {};

  const task = await findTaskInProject(taskId, projectId);

  if (
    !canManageTasks(req.projectRole) &&
    !isSameId(task.assignedTo, req.user._id)
  ) {
    throw new ApiError(
      403,
      "Only the assignee, an admin or a project admin can change a task's status",
    );
  }

  task.status = status;
  await task.save();
  await populateTask(task);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task status updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await findTaskInProject(taskId, projectId);

  await task.deleteOne();
  await Subtask.deleteMany({ task: task._id });
  await removeAttachmentFiles(task.attachments);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

// ---------- subtasks ----------

const createSubTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { title } = req.body ?? {};

  const task = await findTaskInProject(taskId, projectId);

  const subtask = await Subtask.create({
    title,
    task: task._id,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;
  const { title, isCompleted } = req.body ?? {};

  if (title === undefined && isCompleted === undefined) {
    throw new ApiError(400, "Provide title or isCompleted to update");
  }

  const { subtask, task } = await findSubtaskInProject(subTaskId, projectId);

  // plain members: only tick/untick subtasks of tasks assigned to them
  if (!canManageTasks(req.projectRole)) {
    if (!isSameId(task.assignedTo, req.user._id) || title !== undefined) {
      throw new ApiError(
        403,
        "Members can only mark subtasks of their own tasks as completed",
      );
    }
  }

  if (title !== undefined) subtask.title = title;
  if (isCompleted !== undefined) subtask.isCompleted = isCompleted;
  await subtask.save();

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
  const { projectId, subTaskId } = req.params;

  const { subtask } = await findSubtaskInProject(subTaskId, projectId);
  await subtask.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
