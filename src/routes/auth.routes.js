import { Router } from "express";
import { login, registerUser } from "../controllers/authUser.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { logoutUser } from "../controllers/authUser.controller.js";
const router = Router();

router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), login);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
