import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getSettings,
  updateSettings,
  getHomepage,
  updateHomepage,
} from "../controllers/settingController.js";

const router = Router();

router.get("/", getSettings);
router.put("/", requireAuth, updateSettings);
router.get("/homepage", getHomepage);
router.put("/homepage", requireAuth, updateHomepage);

export default router;