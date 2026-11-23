import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { importFeed } from "../controllers/ticketController.js";

const router = Router();

router.post("/import", authenticate, importFeed);

export default router;