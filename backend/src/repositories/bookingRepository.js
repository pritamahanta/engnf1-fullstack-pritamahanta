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

export async function findBookingById(id, db = pool) {
  const { rows } = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function findBookings({ userId, status, resourceId, from, to }, { limit, offset }) {
  const { rows } = await pool.query(
    `WITH filtered AS (
       SELECT *
       FROM bookings
       WHERE ($1::integer IS NULL OR user_id = $1)
         AND ($2::text IS NULL OR status = $2)
         AND ($3::integer IS NULL OR resource_id = $3)
         AND ($4::timestamptz IS NULL OR end_time > $4)
         AND ($5::timestamptz IS NULL OR start_time < $5)
     ),
     page_rows AS (
       SELECT * FROM filtered
       ORDER BY start_time ASC, id ASC
       LIMIT $6 OFFSET $7
     ),
     totals AS (
       SELECT count(*)::integer AS total FROM filtered
     )
     SELECT page_rows.*, totals.total
     FROM totals
     LEFT JOIN page_rows ON true
     ORDER BY page_rows.start_time ASC, page_rows.id ASC`,
    [userId ?? null, status ?? null, resourceId ?? null, from ?? null, to ?? null, limit, offset]
  );
  return { rows: rows.filter((row) => row.id !== null), total: rows[0].total };
}

export async function lockResourceForBookingChange(bookingId, db) {
  const { rowCount } = await db.query(
    `SELECT r.id
     FROM resources AS r
     JOIN bookings AS b ON b.resource_id = r.id
     WHERE b.id = $1
     FOR NO KEY UPDATE OF r`,
    [bookingId]
  );
  return rowCount === 1;
}

export async function updateBookingStatus(id, status, note, allowedStatuses, db) {
  const { rows } = await db.query(
    `UPDATE bookings
     SET status = $2, decision_note = COALESCE($3, decision_note)
     WHERE id = $1
       AND start_time > clock_timestamp()
       AND status = ANY($4::text[])
     RETURNING *`,
    [id, status, note, allowedStatuses]
  );
  return rows[0] ?? null;
}
