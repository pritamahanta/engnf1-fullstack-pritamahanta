import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { getTicket, getTickets, importFeed } from "../controllers/ticketController.js";

const router = Router();

router.post("/import", authenticate, importFeed);
router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);

export default router;