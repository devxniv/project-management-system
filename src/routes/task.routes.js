import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from "../controllers/task.controller.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;

// List project tasks — all roles can view
router.get(
  "/:projectId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN, MEMBER]),
  getTasks,
);

// Create task — Admin and Project Admin only
router.post(
  "/:projectId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN]),
  createTask,
);

// Get task details — all roles can view
router.get(
  "/:projectId/t/:taskId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN, MEMBER]),
  getTaskById,
);

// Update task — Admin and Project Admin only
router.put(
  "/:projectId/t/:taskId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN]),
  updateTask,
);

// Delete task — Admin and Project Admin only
router.delete(
  "/:projectId/t/:taskId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN]),
  deleteTask,
);

// Create subtask — Admin and Project Admin only
router.post(
  "/:projectId/t/:taskId/subtasks",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN]),
  createSubTask,
);

// Update subtask — all roles can update
router.put(
  "/:projectId/st/:subTaskId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN, MEMBER]),
  updateSubTask,
);

// Delete subtask — Admin and Project Admin only
router.delete(
  "/:projectId/st/:subTaskId",
  verifyJWT,
  validateProjectPermission([ADMIN, PROJECT_ADMIN]),
  deleteSubTask,
);

export default router;
