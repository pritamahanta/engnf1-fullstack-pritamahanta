import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { getAdminStats } from "../services/adminService.js";

const router = Router();

router.get("/stats", authenticate, requireRole("ADMIN"), async (_req, res) => {
  res.json(await getAdminStats());
});

export default router;
