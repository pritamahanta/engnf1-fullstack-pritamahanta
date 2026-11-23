import { z } from "zod";
import * as bookings from "../services/bookingService.js";
import { parsePagination } from "../utils/pagination.js";
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

const bookingStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
const utcDate = utc.transform((value) => new Date(value));
const myListSchema = z.object({ status: bookingStatus.optional() });
const adminListSchema = myListSchema.extend({
  resourceId: z.string().regex(/^\d+$/).transform(Number).pipe(id).optional(),
  from: utcDate.optional(),
  to: utcDate.optional(),
});
const rejectionSchema = z.strictObject({ note: z.string().trim().min(5).max(200) });

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

export async function listMyBookings(req, res) {
  const filters = parse(myListSchema, req.query);
  const pagination = parsePagination(req.query);
  res.json(await bookings.listBookings({ ...filters, userId: req.user.id }, pagination));
}

export async function listAllBookings(req, res) {
  const filters = parse(adminListSchema, req.query);
  const pagination = parsePagination(req.query);
  res.json(await bookings.listBookings(filters, pagination));
}

export async function getBooking(req, res) {
  res.json(await bookings.getBooking(parseId(req.params.id), req.user));
}

export async function cancelBooking(req, res) {
  const result = await bookings.changeBookingStatus(
    parseId(req.params.id), "CANCELLED", req.user.id
  );
  res.json(result);
}

export async function approveBooking(req, res) {
  res.json(await bookings.changeBookingStatus(parseId(req.params.id), "APPROVED"));
}

export async function rejectBooking(req, res) {
  const result = await bookings.changeBookingStatus(
    parseId(req.params.id), "REJECTED", null, () => parse(rejectionSchema, req.body).note
  );
  res.json(result);
}
