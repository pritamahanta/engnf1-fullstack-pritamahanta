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

export async function findTicketWithEvents(id, db) {
  const { rows } = await db.query(
    `SELECT t.*,
            COALESCE(
              (SELECT json_agg(e ORDER BY e.created_at DESC, e.id DESC)
               FROM ticket_events AS e
               WHERE e.ticket_id = t.id),
              '[]'::json
            ) AS events
     FROM tickets AS t
     WHERE t.id = $1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function lockTicketById(id, db) {
  const { rows } = await db.query(
    `SELECT id, category, priority, status, assignee_id, is_human_override, is_reviewed
     FROM tickets
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  return rows[0] ?? null;
}

export async function updateReviewedTicket(ticket, db) {
  await db.query(
    `UPDATE tickets
     SET category = $2,
         priority = $3,
         status = $4,
         assignee_id = $5,
         is_human_override = $6,
         is_reviewed = $7,
         updated_at = now()
     WHERE id = $1`,
    [
      ticket.id,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.assignee_id,
      ticket.is_human_override,
      ticket.is_reviewed,
    ]
  );
}

export async function insertTicketEvent(ticketId, { field, oldValue, newValue }, actor, db) {
  await db.query(
    `INSERT INTO ticket_events (ticket_id, field, old_value, new_value, actor)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      ticketId,
      field,
      oldValue === null ? null : String(oldValue),
      newValue === null ? null : String(newValue),
      actor,
    ]
  );
}

export async function readTicketStats(db) {
  const { rows } = await db.query(
    `SELECT category,
            priority,
            status,
            count(*) AS count,
            count(*) FILTER (WHERE is_reviewed) AS reviewed_count,
            count(*) FILTER (WHERE is_reviewed AND category = auto_category) AS agreed_count
     FROM tickets
     GROUP BY GROUPING SETS ((category), (priority), (status), ())`
  );

  const stats = {
    categoryRows: [],
    priorityRows: [],
    statusRows: [],
    reviewedCount: 0,
    agreedCount: 0,
  };

  for (const row of rows) {
    const { category, priority, status, count } = row;
    if (category !== null) {
      stats.categoryRows.push({ key: category, count });
    } else if (priority !== null) {
      stats.priorityRows.push({ key: priority, count });
    } else if (status !== null) {
      stats.statusRows.push({ key: status, count });
    } else {
      stats.reviewedCount = row.reviewed_count;
      stats.agreedCount = row.agreed_count;
    }
  }

  return stats;
}
