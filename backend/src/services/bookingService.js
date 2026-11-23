import pool from "../config/db.js";
import {
  countFutureBookings,
  findOccupiedSlots,
  insertBooking,
  lockBookingResource,
  lockBookingTicket,
  lockBookingUser,
} from "../repositories/bookingRepository.js";
import { conflict, notFound, unauthenticated, validationError } from "../utils/errors.js";
import { toBooking } from "../utils/mappers.js";
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
