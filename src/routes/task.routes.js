import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from "../controllers/task.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import {
  createTaskValidator,
  updateTaskValidator,
  taskStatusValidator,
  taskIdValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  subTaskIdValidator,
} from "../validators/index.js";
import { UserRolesEnum } from "../utils/constants.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();
router.use(verifyJWT);

const { ADMIN, PROJECT_ADMIN } = UserRolesEnum;
const managers = [ADMIN, PROJECT_ADMIN];

// List tasks (any member). Optional query: ?status=&assignedTo=<id|me>&page=&limit=
router.get("/:projectId", validateProjectPermission(), getTasks);

// Create task (admin, project admin)
router.post(
  "/:projectId",
  validateProjectPermission(managers),
  upload.array("attachments", 5),
  createTaskValidator(),
  validate,
  createTask,
);

// Task details with subtasks (any member)
router.get(
  "/:projectId/t/:taskId",
  validateProjectPermission(),
  taskIdValidator(),
  validate,
  getTaskById,
);

// Update task (admin, project admin)
router.put(
  "/:projectId/t/:taskId",
  validateProjectPermission(managers),
  upload.array("attachments", 5),
  updateTaskValidator(),
  validate,
  updateTask,
);

// Change status (any member; the controller limits it to the assignee or a manager)
router.patch(
  "/:projectId/t/:taskId/status",
  validateProjectPermission(),
  taskStatusValidator(),
  validate,
  updateTaskStatus,
);

// Delete task (admin, project admin)
router.delete(
  "/:projectId/t/:taskId",
  validateProjectPermission(managers),
  taskIdValidator(),
  validate,
  deleteTask,
);

// Create subtask (admin, project admin)
router.post(
  "/:projectId/t/:taskId/subtasks",
  validateProjectPermission(managers),
  createSubTaskValidator(),
  validate,
  createSubTask,
);

// Update subtask (any member; the controller limits members to ticking their own tasks)
router.put(
  "/:projectId/st/:subTaskId",
  validateProjectPermission(),
  updateSubTaskValidator(),
  validate,
  updateSubTask,
);

// Delete subtask (admin, project admin)
router.delete(
  "/:projectId/st/:subTaskId",
  validateProjectPermission(managers),
  subTaskIdValidator(),
  validate,
  deleteSubTask,
);

export default router;
