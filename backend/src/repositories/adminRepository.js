import pool from "../config/db.js";

export async function readAdminStats() {
  const { rows } = await pool.query(
    `WITH top_resources AS (
       SELECT r.id AS "resourceId", r.name, count(*)::integer AS "bookingCount"
       FROM bookings AS b
       JOIN resources AS r ON r.id = b.resource_id
       GROUP BY r.id, r.name
       ORDER BY "bookingCount" DESC, r.name, r.id
       LIMIT 3
     )
     SELECT
       (SELECT count(*)::integer FROM resources WHERE is_active) AS "activeResources",
       (SELECT json_build_object(
         'PENDING', (count(*) FILTER (WHERE status = 'PENDING'))::integer,
         'APPROVED', (count(*) FILTER (WHERE status = 'APPROVED'))::integer,
         'REJECTED', (count(*) FILTER (WHERE status = 'REJECTED'))::integer,
         'CANCELLED', (count(*) FILTER (WHERE status = 'CANCELLED'))::integer
       ) FROM bookings) AS "bookingsByStatus",
       COALESCE(
         (SELECT json_agg(t ORDER BY t."bookingCount" DESC, t.name, t."resourceId")
          FROM top_resources AS t),
         '[]'::json
       ) AS "topResources"`
  );
  return rows[0];
}
