import pool from "../config/db.js";

export async function lockBookingUser(userId, db) {
  const { rowCount } = await db.query(
    "SELECT id FROM users WHERE id = $1 FOR NO KEY UPDATE",
    [userId]
  );
  return rowCount === 1;
}

export async function lockBookingResource(resourceId, db) {
  const { rows } = await db.query(
    "SELECT is_active FROM resources WHERE id = $1 FOR SHARE",
    [resourceId]
  );
  return rows[0] ?? null;
}

export async function lockBookingTicket(ticketId, db) {
  const { rowCount } = await db.query(
    "SELECT id FROM tickets WHERE id = $1 FOR KEY SHARE",
    [ticketId]
  );
  return rowCount === 1;
}

export async function countFutureBookings(userId, db) {
  const { rows } = await db.query(
    `SELECT count(*)::integer AS count
     FROM bookings
     WHERE user_id = $1
       AND start_time > statement_timestamp()
       AND status IN ('PENDING', 'APPROVED')`,
    [userId]
  );
  return rows[0].count;
}

export async function insertBooking(userId, input, db) {
  const { rows } = await db.query(
    `INSERT INTO bookings (user_id, resource_id, ticket_id, start_time, end_time, purpose)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, input.resourceId, input.ticketId ?? null, input.startTime, input.endTime, input.purpose]
  );
  return rows[0];
}

export async function findOccupiedSlots(resourceId, from, to) {
  const { rows } = await pool.query(
    `SELECT start_time, end_time, status
     FROM bookings
     WHERE resource_id = $1
       AND status IN ('PENDING', 'APPROVED')
       AND start_time < $3
       AND end_time > $2
     ORDER BY start_time, id`,
    [resourceId, from, to]
  );
  return rows;
}
