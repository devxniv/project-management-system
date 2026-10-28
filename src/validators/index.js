import { body, param } from "express-validator";
import {
  AvailableUserRole,
  AvailableTaskStatuses,
} from "../utils/constants.js";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64; // bcrypt only uses the first 72 bytes
const OBJECT_ID = /^[a-f\d]{24}$/i;

// ---------- shared rules ----------

// Passwords are never trimmed or otherwise modified
const newPasswordRule = (field, label = "Password") =>
  body(field)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .withMessage(`${label} must be a string`)
    .bail()
    .isLength({ min: PASSWORD_MIN, max: PASSWORD_MAX })
    .withMessage(
      `${label} must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`,
    );

// For existing passwords (login / old password): no length rule, so older accounts still work
const existingPasswordRule = (field, label = "Password") =>
  body(field)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .withMessage(`${label} must be a string`);

const emailRule = () =>
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isString()
    .withMessage("Email must be a string")
    .bail()
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .toLowerCase();

const userIdParam = () =>
  param("userId").isMongoId().withMessage("Invalid user id");
const taskIdParam = () =>
  param("taskId").isMongoId().withMessage("Invalid task id");
const subTaskIdParam = () =>
  param("subTaskId").isMongoId().withMessage("Invalid subtask id");

const roleRule = () =>
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .bail()
    .isIn(AvailableUserRole)
    .withMessage("Role is invalid");

const statusRule = () =>
  body("status")
    .isIn(AvailableTaskStatuses)
    .withMessage(`Status must be one of: ${AvailableTaskStatuses.join(", ")}`);

// a user id, or null to leave / make the task unassigned
const assignedToRule = () =>
  body("assignedTo")
    .optional({ values: "undefined" })
    .custom((v) => v === null || (typeof v === "string" && OBJECT_ID.test(v)))
    .withMessage("assignedTo must be a user id or null");

// ---------- auth ----------

const userRegisterValidator = () => [
  emailRule(),
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .bail()
    .isString()
    .withMessage("Username must be a string")
    .bail()
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscores"),
  newPasswordRule("password"),
  body("fullName")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Full name must be a string")
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Full name must be at most 100 characters"),
];

const userLoginValidator = () => [
  emailRule(),
  existingPasswordRule("password"),
];

const userChangeCurrentPasswordValidator = () => [
  existingPasswordRule("oldPassword", "Old password"),
  newPasswordRule("newPassword", "New password"),
];

const userForgotPasswordValidator = () => [emailRule()];

const userResetForgotPasswordValidator = () => [
  newPasswordRule("newPassword", "New password"),
];

// ---------- projects and members ----------

const createProjectValidator = () => [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be at most 500 characters"),
];

const addMembertoProjectValidator = () => [emailRule(), roleRule()];

const updateMemberRoleValidator = () => [userIdParam(), roleRule()];

const memberIdParamValidator = () => [userIdParam()];

// ---------- tasks ----------

const createTaskValidator = () => [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Title must be between 1 and 150 characters"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be at most 2000 characters"),
  assignedToRule(),
  statusRule().optional(),
];

const updateTaskValidator = () => [
  taskIdParam(),
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Title must be between 1 and 150 characters"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be at most 2000 characters"),
  assignedToRule(),
  statusRule().optional(),
];

const taskStatusValidator = () => [taskIdParam(), statusRule()];

const taskIdValidator = () => [taskIdParam()];

// ---------- subtasks ----------

const createSubTaskValidator = () => [
  taskIdParam(),
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Title must be between 1 and 150 characters"),
];

const updateSubTaskValidator = () => [
  subTaskIdParam(),
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage("Title must be between 1 and 150 characters"),
  body("isCompleted")
    .optional()
    .isBoolean({ strict: true })
    .withMessage("isCompleted must be true or false"),
];

const subTaskIdValidator = () => [subTaskIdParam()];

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  createProjectValidator,
  addMembertoProjectValidator,
  updateMemberRoleValidator,
  memberIdParamValidator,
  createTaskValidator,
  updateTaskValidator,
  taskStatusValidator,
  taskIdValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  subTaskIdValidator,
};
