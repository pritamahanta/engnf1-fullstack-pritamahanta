import pool from "../config/db.js";
import {
  countFutureBookings,
  findBookingById,
  findBookings,
  findOccupiedSlots,
  insertBooking,
  lockBookingResource,
  lockBookingTicket,
  lockBookingUser,
  lockResourceForBookingChange,
  updateBookingStatus,
} from "../repositories/bookingRepository.js";
import { conflict, forbidden, notFound, unauthenticated, validationError } from "../utils/errors.js";
import { toBooking } from "../utils/mappers.js";
import { paginated } from "../utils/pagination.js";
import { getResource } from "./resourceService.js";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export async function getAvailability(resourceId, includeInactive, readRange) {
  await getResource(resourceId, includeInactive);
  const { from, to } = readRange();
  if (to <= from || to - from > 7 * DAY) {
    throw validationError("Availability range must be positive and at most 7 days");
  }

  const rows = await findOccupiedSlots(resourceId, from, to);
  const bookings = rows.map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }));
  return { resourceId, from, to, bookings };
}

export async function createBooking(userId, input) {
  const duration = input.endTime - input.startTime;
  if (duration < 30 * MINUTE || duration > 240 * MINUTE) {
    throw validationError("Booking duration must be between 30 and 240 minutes");
  }
  validateStart(input.startTime);

  try {
    return await withBookingTransaction(async (client) => {
      if (!(await lockBookingUser(userId, client))) throw unauthenticated();

      const resource = await lockBookingResource(input.resourceId, client);
      if (!resource) throw notFound("Resource not found");
      if (input.ticketId != null && !(await lockBookingTicket(input.ticketId, client))) {
        throw notFound("Ticket not found");
      }

      if (!resource.is_active) throw conflict("Resource is inactive");
      if ((await countFutureBookings(userId, client)) >= 3) {
        throw conflict("You already have 3 upcoming bookings");
      }
      validateStart(input.startTime);

      return toBooking(await insertBooking(userId, input, client));
    });
  } catch (error) {
    if (error.code === "23P01" && error.constraint === "bookings_no_overlap") {
      throw conflict("This resource is already booked for that time");
    }
    throw error;
  }
}

export async function listBookings(filters, pagination) {
  const { from, to } = filters;
  if (from && to && to <= from) {
    throw validationError("to must be after from");
  }

  const { rows, total } = await findBookings(filters, pagination);
  return paginated(rows.map(toBooking), pagination.page, pagination.limit, total);
}

export async function getBooking(id, user) {
  const row = await findBookingById(id);
  if (!row) throw notFound("Booking not found");
  if (user.role !== "ADMIN" && row.user_id !== user.id) throw forbidden();
  return toBooking(row);
}

export async function changeBookingStatus(id, status, ownerId = null, readNote = () => null) {
  return withBookingTransaction(async (client) => {
    // Coordinate status changes with creation on the same resource.
    if (!(await lockResourceForBookingChange(id, client))) {
      throw notFound("Booking not found");
    }
    const current = await findBookingById(id, client);
    if (!current) throw notFound("Booking not found");

    if (status === "CANCELLED" && current.user_id !== ownerId) throw forbidden();
    const note = readNote();
    const allowedStatuses = status === "CANCELLED" ? ["PENDING", "APPROVED"] : ["PENDING"];
    const updated = await updateBookingStatus(id, status, note, allowedStatuses, client);
    if (!updated) throw conflict("A booking can only change from an eligible status before it starts");
    return toBooking(updated);
  });
}

function validateStart(startTime) {
  const leadTime = startTime.getTime() - Date.now();
  if (leadTime <= 0 || leadTime > 30 * DAY) {
    throw validationError("Start time must be in the future and within 30 days");
  }
}

async function withBookingTransaction(run) {
  const client = await pool.connect();
  let discardClient = false;

  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}
