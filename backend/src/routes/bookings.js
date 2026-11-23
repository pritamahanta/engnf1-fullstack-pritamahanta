import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { createBooking } from "../controllers/bookingController.js";

const router = Router();

router.post("/", authenticate, createBooking);

export default router;
