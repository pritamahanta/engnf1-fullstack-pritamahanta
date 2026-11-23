export function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function toTicket(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    subject: row.subject,
    body: row.body,
    autoCategory: row.auto_category,
    category: row.category,
    isHumanOverride: row.is_human_override,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assignee_id,
    isReviewed: row.is_reviewed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTicketEvent(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    actor: row.actor,
    createdAt: row.created_at,
  };
}

const CATEGORIES = ["BILLING", "BUG", "FEATURE_REQUEST", "LOGIN", "DELIVERY"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

// rows: [{ key, count }] from GROUP BY. COUNT() arrives from pg as a string.
function countMap(keys, rows) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) {
    out[r.key] = Number(r.count);
  }
  return out;
}

export function toStats({ categoryRows, priorityRows, statusRows, reviewedCount, agreedCount }) {
  const reviewed = Number(reviewedCount);
  const agreed = Number(agreedCount);
  return {
    byCategory: countMap(CATEGORIES, categoryRows),
    byPriority: countMap(PRIORITIES, priorityRows),
    byStatus: countMap(STATUSES, statusRows),
    reviewedCount: reviewed,
    modelAgreementRate: reviewed === 0 ? 0 : Math.round((agreed / reviewed) * 1000) / 10,
  };
}

export function toResource(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
