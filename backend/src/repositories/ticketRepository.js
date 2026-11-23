export async function lockTicketByExternalId(externalId, db) {
  const { rows } = await db.query(
    `SELECT id, category, priority, is_human_override
     FROM tickets
     WHERE external_id = $1
     FOR UPDATE`,
    [externalId]
  );
  return rows[0] ?? null;
}

export async function insertImportedTicket(ticket, prediction, db) {
  const { rowCount } = await db.query(
    `INSERT INTO tickets (external_id, subject, body, auto_category, category, priority)
     VALUES ($1, $2, $3, $4, $4, $5)
     ON CONFLICT (external_id) DO NOTHING
     RETURNING id`,
    [ticket.externalId, ticket.subject, ticket.body, prediction.category, prediction.priority]
  );
  return rowCount === 1;
}

export async function updateImportedTicket(id, ticket, prediction, db) {
  const { rowCount } = await db.query(
    `UPDATE tickets
     SET subject = $2, body = $3, category = $4, priority = $5, updated_at = now()
     WHERE id = $1
       AND (subject, body, category, priority) IS DISTINCT FROM ($2, $3, $4, $5)`,
    [id, ticket.subject, ticket.body, prediction.category, prediction.priority]
  );
  return rowCount;
}

export async function countTickets(db) {
  const { rows } = await db.query("SELECT count(*)::integer AS total FROM tickets");
  return rows[0].total;
}

export async function findTickets({ status, category, priority, q, limit, offset }, db) {
  const { rows } = await db.query(
    `WITH filtered AS (
       SELECT *
       FROM tickets
       WHERE ($1::text IS NULL OR status = $1)
         AND ($2::text IS NULL OR category = $2)
         AND ($3::text IS NULL OR priority = $3)
         AND (
           $4::text IS NULL
           OR strpos(lower(subject), lower($4)) > 0
           OR strpos(lower(body), lower($4)) > 0
         )
     ),
     page_rows AS (
       SELECT *
       FROM filtered
       ORDER BY created_at DESC, id DESC
       LIMIT $5 OFFSET $6
     ),
     totals AS (
       SELECT count(*)::integer AS total
       FROM filtered
     )
     SELECT page_rows.*, totals.total
     FROM totals
     LEFT JOIN page_rows ON true
     ORDER BY page_rows.created_at DESC, page_rows.id DESC`,
    [status ?? null, category ?? null, priority ?? null, q || null, limit, offset]
  );

  return {
    rows: rows.filter((row) => row.id !== null),
    total: rows[0].total,
  };
}