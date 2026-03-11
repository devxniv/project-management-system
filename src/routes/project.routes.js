import { Router } from "express";
import {
  addMembersToProject,
  deleteMember,
  updateMemberRole,
  getProjectMembers,
  getProjectById,
  deleteProject,
  updateProject,
  getProjects,
  createProject,
} from "../controllers/project.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createProjectValidator,
  addMembertoProjectValidator,
} from "../validators/index.js";
import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);
//Method Chaining in Express to handle multiple HTTP verbs on the same URL path "/"
router
  .route("/")
  .get(getProjects)
  .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole))
  .put(
    createProjectValidator(),
    validate,
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

//update or delete a member
router
  .route("/:projectId/members")
  .get(getProjectMembers)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    addMembertoProjectValidator(),
    validate,
    addMembersToProject,
  );

router
  .route("/:projectId/members/:userId")
  .put(validateProjectPermission([UserRolesEnum.ADMIN]), updateMemberRole)
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember);
export default router;
