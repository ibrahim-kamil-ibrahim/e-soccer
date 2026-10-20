import { Router } from "express";
import { body } from "express-validator";
import { login, me, logout, updateProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email or username
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, description: "Email or username" }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token: { type: string }
 *                 user: { type: object }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many failed attempts, account locked }
 */
router.post(
  "/login",
  body("email").trim().notEmpty().withMessage("Username or email is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
  validate,
  login
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current user
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post("/logout", logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { type: object }
 *       401: { description: Not authenticated }
 */
router.get("/me", requireAuth, me);

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update profile (name, email, preferences)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               preferences: { type: object }
 *     responses:
 *       200: { description: Profile updated }
 *       401: { description: Not authenticated }
 */
router.put(
  "/profile",
  requireAuth,
  body("name").optional().isString().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("A valid email is required"),
  validate,
  updateProfile
);

export default router;