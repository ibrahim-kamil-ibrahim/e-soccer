import { Router } from "express";
import { body } from "express-validator";
import { login, me, logout } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/login",
  body("email").trim().notEmpty().withMessage("Username or email is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  validate,
  login
);

router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;