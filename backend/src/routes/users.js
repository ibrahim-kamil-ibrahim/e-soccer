/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List admin users (SUPER_ADMIN only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [SUPER_ADMIN, ADMIN, EDITOR] }
 *     responses:
 *       200: { description: Paginated list of users }
 *       403: { description: Insufficient permissions }
 */
import { Router } from "express";
import { body } from "express-validator";
import path from "node:path";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  deleteUsers,
  exportUsers,
  exportUsersTemplate,
  importUsers,
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

import multer from "multer";

const importMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new AppError(400, "Only .xlsx and .xls files are allowed"));
  },
});

router.get("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), listUsers);
router.get("/export", requireAuth, requireRole("SUPER_ADMIN"), exportUsers);
router.get("/template", requireAuth, requireRole("SUPER_ADMIN"), exportUsersTemplate);
router.post("/import", requireAuth, requireRole("SUPER_ADMIN"), importMulter.single("file"), importUsers);
router.get("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), getUser);
router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("A valid email is required"),
  validate,
  createUser
);
router.put(
  "/:id",
  requireAuth,
  updateUser
);
router.delete("/:id", requireAuth, requireRole("SUPER_ADMIN"), deleteUser);
router.post(
  "/bulk",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  body("ids").isArray({ min: 1 }).withMessage("ids array with at least one id is required"),
  validate,
  deleteUsers
);

export default router;
