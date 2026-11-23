import pool from "../config/db.js";
import { classifyTicket } from "../utils/classifier.js";
import { notFound } from "../utils/errors.js";
import { toTicket, toTicketEvent } from "../utils/mappers.js";
import { paginated } from "../utils/pagination.js";
import { findUserById } from "../repositories/userRepository.js";
import {
  countTickets,
  findTickets,
  findTicketWithEvents,
  insertImportedTicket,
  insertTicketEvent,
  lockTicketByExternalId,
  lockTicketById,
  updateImportedTicket,
  updateReviewedTicket,
} from "../repositories/ticketRepository.js";

export async function importTickets(tickets) {
  const byExternalId = new Map(tickets.map((ticket) => [ticket.externalId, ticket]));
  const externalIds = [...byExternalId.keys()].sort();

  return withTicketTransaction(async (client) => {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedOverrideCount = 0;

    for (const externalId of externalIds) {
      const ticket = byExternalId.get(externalId);
      let existing = await lockTicketByExternalId(externalId, client);
      let prediction;

      if (!existing) {
        prediction = classifyTicket(ticket.subject, ticket.body);

        if (await insertImportedTicket(ticket, prediction, client)) {
          importedCount += 1;
          continue;
        }

        existing = await lockTicketByExternalId(externalId, client);
        if (!existing) throw new Error("Ticket missing after import conflict");
      }

      if (existing.is_human_override) {
        skippedOverrideCount += 1;
        prediction = existing;
      } else {
        prediction ??= classifyTicket(ticket.subject, ticket.body);
      }

      updatedCount += await updateImportedTicket(existing.id, ticket, prediction, client);
    }

    const total = await countTickets(client);
    return { importedCount, updatedCount, skippedOverrideCount, total };
  });
}

export async function listTickets(filters, { page, limit, offset }) {
  const { rows, total } = await findTickets({ ...filters, limit, offset }, pool);
  return paginated(rows.map(toTicket), page, limit, total);
}

export async function getTicketDetail(id, db = pool) {
  const row = await findTicketWithEvents(id, db);
  if (!row) throw notFound("Ticket not found");

  const events = row.events.map((event) =>
    toTicketEvent({ ...event, created_at: new Date(event.created_at) })
  );

  return { ticket: toTicket(row), events };
}

export async function updateTicket(id, readPatch, actor) {
  return withTicketTransaction(async (client) => {
    const current = await lockTicketById(id, client);
    if (!current) throw notFound("Ticket not found");

    // The contract checks whether the ticket exists before validating its patch.
    const patch = readPatch();
    if (patch.assigneeId != null) {
      const assignee = await findUserById(patch.assigneeId, client);
      if (!assignee) throw notFound("Assignee not found");
    }

    const next = { ...current };
    const changes = [];

    for (const [field, newValue] of Object.entries(patch)) {
      const column = field === "assigneeId" ? "assignee_id" : field;
      const oldValue = current[column];
      if (oldValue === newValue) continue;

      next[column] = newValue;
      changes.push({ field, oldValue, newValue });
    }

    if (changes.length > 0) {
      const categoryChanged = next.category !== current.category;
      const leftOpen = current.status === "OPEN" && next.status !== "OPEN";
      next.is_human_override = current.is_human_override || categoryChanged;
      next.is_reviewed = current.is_reviewed || categoryChanged || leftOpen;

      await updateReviewedTicket(next, client);
      for (const change of changes) {
        await insertTicketEvent(id, change, actor, client);
      }
    }

    return getTicketDetail(id, client);
  });
}

async function withTicketTransaction(run) {
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
