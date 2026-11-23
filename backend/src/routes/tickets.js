import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { getTickets, importFeed } from "../controllers/ticketController.js";

const router = Router();

router.post("/import", authenticate, importFeed);
router.get("/", authenticate, getTickets);

export default router;