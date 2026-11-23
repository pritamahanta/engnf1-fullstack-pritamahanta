import { z } from "zod";
import * as bookings from "../services/bookingService.js";
import { parse, parseId } from "../utils/validate.js";

const id = z.number().int().min(1).max(2147483647);
const utc = z.iso.datetime({ offset: true }).refine(
  (value) => /(?:Z|\+00:00)$/.test(value),
  "Timestamp must be in UTC"
);
const slotTime = utc.refine(
  (value) => /T\d{2}:(?:00|30)(?::00(?:\.0+)?)?(?:Z|\+00:00)$/.test(value),
  "Use a UTC half-hour boundary with zero seconds and milliseconds"
).transform((value) => new Date(value));

const bookingSchema = z.strictObject({
  resourceId: id,
  ticketId: id.nullable().optional(),
  startTime: slotTime,
  endTime: slotTime,
  purpose: z.string().trim().min(5).max(200),
});

const rangeSchema = z.object({
  from: utc.transform((value) => new Date(value)),
  to: utc.transform((value) => new Date(value)),
});

export async function createBooking(req, res) {
  const input = parse(bookingSchema, req.body);
  res.status(201).json(await bookings.createBooking(req.user.id, input));
}

export async function getAvailability(req, res) {
  const id = parseId(req.params.id);
  const includeInactive = req.user.role === "ADMIN";
  const result = await bookings.getAvailability(id, includeInactive, () => parse(rangeSchema, req.query));
  res.json(result);
}
