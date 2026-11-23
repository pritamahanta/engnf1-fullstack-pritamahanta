import pool from "../config/db.js";

export async function findResources({ search, type, minCapacity }, { limit, offset }, includeInactive) {
  const { rows } = await pool.query(
    `WITH filtered AS (
       SELECT *
       FROM resources
       WHERE ($1::boolean OR is_active)
         AND ($2::text IS NULL OR strpos(lower(name), lower($2)) > 0)
         AND ($3::text IS NULL OR type = $3)
         AND ($4::integer IS NULL OR capacity >= $4)
     ),
     page_rows AS (
       SELECT *
       FROM filtered
       ORDER BY name ASC, id ASC
       LIMIT $5 OFFSET $6
     ),
     totals AS (
       SELECT count(*)::integer AS total FROM filtered
     )
     SELECT page_rows.*, totals.total
     FROM totals
     LEFT JOIN page_rows ON true
     ORDER BY page_rows.name ASC, page_rows.id ASC`,
    [includeInactive, search || null, type ?? null, minCapacity ?? null, limit, offset]
  );

  return { rows: rows.filter((row) => row.id !== null), total: rows[0].total };
}

export async function findResourceById(id, includeInactive) {
  const { rows } = await pool.query(
    "SELECT * FROM resources WHERE id = $1 AND ($2::boolean OR is_active)",
    [id, includeInactive]
  );
  return rows[0] ?? null;
}

export async function insertResource({ name, type, capacity, description }) {
  const { rows } = await pool.query(
    `INSERT INTO resources (name, type, capacity, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, type, capacity, description ?? null]
  );
  return rows[0];
}

export async function updateResource(id, patch) {
  const { rows } = await pool.query(
    `UPDATE resources
     SET name = COALESCE($2, name),
         type = COALESCE($3, type),
         capacity = COALESCE($4, capacity),
         description = CASE WHEN $5 THEN $6 ELSE description END,
         is_active = COALESCE($7, is_active)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      patch.name ?? null,
      patch.type ?? null,
      patch.capacity ?? null,
      Object.hasOwn(patch, "description"),
      patch.description ?? null,
      patch.isActive ?? null,
    ]
  );
  return rows[0] ?? null;
}
