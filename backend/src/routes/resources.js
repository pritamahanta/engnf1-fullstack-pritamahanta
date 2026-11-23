import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import * as resources from "../controllers/resourceController.js";

const router = Router();

router.get("/", authenticate, resources.listResources);
router.get("/:id", authenticate, resources.getResource);
router.post("/", authenticate, requireRole("ADMIN"), resources.createResource);
router.patch("/:id", authenticate, requireRole("ADMIN"), resources.patchResource);

export default router;
