import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";

import { Subtask } from "../models/subtask.models.js";
import { Task } from "../models/task.models.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserRolesEnum } from "../utils/constants.js";
import fs from "fs/promises";
import path from "path";

// ---------- helpers ----------

const isDuplicateKey = (err) => err?.code === 11000;

const duplicateNameError = () =>
  new ApiError(409, "You already have a project with this name");

// A project must always keep at least one admin
const assertNotLastAdmin = async (projectId, member) => {
  if (member.role !== UserRolesEnum.ADMIN) return;

  const adminCount = await ProjectMember.countDocuments({
    project: projectId,
    role: UserRolesEnum.ADMIN,
  });

  if (adminCount <= 1) {
    throw new ApiError(
      409,
      "A project must have at least one admin. Promote another member first.",
    );
  }
};

// ---------- projects ----------

const getProjects = asyncHandler(async (req, res) => {
  const memberships = await ProjectMember.find({ user: req.user._id })
    .populate("project", "name description createdBy createdAt")
    .sort({ createdAt: -1 })
    .lean();

  // populate gives null if a project was deleted but its membership was left behind
  const valid = memberships.filter((m) => m.project);
  const projectIds = valid.map((m) => m.project._id);

  const counts = await ProjectMember.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: "$project", members: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.members]));

  const projects = valid.map((m) => ({
    project: {
      ...m.project,
      members: countMap.get(String(m.project._id)) ?? 0,
    },
    role: m.role,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId).lean();

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // req.projectRole was set by validateProjectPermission
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...project, role: req.projectRole },
        "Project fetched successfully",
      ),
    );
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body ?? {};

  let project;
  try {
    project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
    });
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicateNameError();
    throw err;
  }

  try {
    await ProjectMember.create({
      user: req.user._id,
      project: project._id,
      role: UserRolesEnum.ADMIN,
    });
  } catch (err) {
    // roll back so we never leave a project nobody can access
    await Project.findByIdAndDelete(project._id);
    throw err;
  }

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body ?? {};
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;

  try {
    await project.save(); // runs schema validation (length limits etc.)
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicateNameError();
    throw err;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const session = await mongoose.startSession();
  let deletedProject;
  let attachmentPaths = [];

  try {
    await session.withTransaction(async () => {
      deletedProject = await Project.findByIdAndDelete(projectId, { session });
      if (!deletedProject) {
        throw new ApiError(404, "Project not found");
      }

      const tasks = await Task.find({ project: projectId })
        .select("_id attachments.localPath")
        .session(session)
        .lean();
      const taskIds = tasks.map((t) => t._id);
      attachmentPaths = tasks.flatMap((t) =>
        (t.attachments ?? []).map((a) => a.localPath).filter(Boolean),
      );

      await Subtask.deleteMany({ task: { $in: taskIds } }, { session });
      await Task.deleteMany({ project: projectId }, { session });
      await ProjectMember.deleteMany({ project: projectId }, { session });
    });
  } finally {
    await session.endSession();
  }

  // files are removed only after the database commit has succeeded
  await Promise.all(
    attachmentPaths.map((p) =>
      fs.unlink(path.join(process.cwd(), p)).catch(() => {}),
    ),
  );

  return res
    .status(200)
    .json(new ApiResponse(200, deletedProject, "Project deleted successfully"));
});

// ---------- members ----------

const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body ?? {};
  const { projectId } = req.params;

  const user = await User.findOne({
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
  });
  if (!user) {
    throw new ApiError(404, "No user found with this email");
  }

  const alreadyMember = await ProjectMember.exists({
    project: projectId,
    user: user._id,
  });
  if (alreadyMember) {
    throw new ApiError(
      409,
      "User is already a member of this project. Use the update-role endpoint to change their role.",
    );
  }

  let member;
  try {
    member = await ProjectMember.create({
      user: user._id,
      project: projectId,
      role,
    });
  } catch (err) {
    // two simultaneous requests: the unique index catches the second one
    if (isDuplicateKey(err)) {
      throw new ApiError(409, "User is already a member of this project");
    }
    throw err;
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        _id: member._id,
        role: member.role,
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
        },
      },
      "Project member added successfully",
    ),
  );
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const members = await ProjectMember.find({ project: projectId })
    .populate("user", "username fullName avatar.url")
    .select("-__v")
    .sort({ createdAt: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, members, "Project members fetched"));
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body ?? {}; // validated against the allowed roles by the route validator

  const member = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });
  if (!member) {
    throw new ApiError(404, "Project member not found");
  }

  // demoting an admin: make sure someone else is still admin
  if (role !== UserRolesEnum.ADMIN) {
    await assertNotLastAdmin(projectId, member);
  }

  member.role = role;
  await member.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, member, "Project member role updated successfully"),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  const member = await ProjectMember.findOne({
    project: projectId,
    user: userId,
  });
  if (!member) {
    throw new ApiError(404, "Project member not found");
  }

  await assertNotLastAdmin(projectId, member);
  // free up tasks that were assigned to the removed member
  await Task.updateMany(
    { project: projectId, assignedTo: userId },
    { $unset: { assignedTo: 1 } },
  );
  await member.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, member, "Project member deleted successfully"));
});

export {
  addMembersToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  updateMemberRole,
};
