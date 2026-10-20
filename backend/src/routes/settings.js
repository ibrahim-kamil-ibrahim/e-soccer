/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get website settings
 *     responses:
 *       200: { description: Website settings }
 */

/**
 * @openapi
 * /settings:
 *   put:
 *     tags: [Settings]
 *     summary: Update website settings
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Settings updated }
 */
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getSettings,
  updateSettings,
  getHomepage,
  updateHomepage,
} from "../controllers/settingController.js";

const router = Router();

router.get("/", getSettings);
router.put("/", requireAuth, requireRole("SUPER_ADMIN", "ADMIN"), updateSettings);
router.get("/homepage", getHomepage);
router.put("/homepage", requireAuth, updateHomepage);

export default router;