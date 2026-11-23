import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import * as bookings from "../controllers/bookingController.js";

const router = Router();
const adminOnly = requireRole("ADMIN");

router.post("/", authenticate, bookings.createBooking);
router.get("/", authenticate, adminOnly, bookings.listAllBookings);
router.get("/mine", authenticate, bookings.listMyBookings);
router.get("/:id", authenticate, bookings.getBooking);
router.patch("/:id/cancel", authenticate, bookings.cancelBooking);
router.patch("/:id/approve", authenticate, adminOnly, bookings.approveBooking);
router.patch("/:id/reject", authenticate, adminOnly, bookings.rejectBooking);

export default router;
