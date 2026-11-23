import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { getTicketStats } from "../services/ticketService.js";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  res.json(await getTicketStats());
});

export default router;
