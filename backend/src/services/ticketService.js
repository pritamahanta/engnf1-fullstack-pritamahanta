import pool from "../config/db.js";
import { classifyTicket } from "../utils/classifier.js";
import { notFound } from "../utils/errors.js";
import { toTicket, toTicketEvent } from "../utils/mappers.js";
import { paginated } from "../utils/pagination.js";
import {
  countTickets,
  findTickets,
  findTicketWithEvents,
  insertImportedTicket,
  lockTicketByExternalId,
  updateImportedTicket,
} from "../repositories/ticketRepository.js";

export async function importTickets(tickets) {
  const byExternalId = new Map(tickets.map((ticket) => [ticket.externalId, ticket]));
  const externalIds = [...byExternalId.keys()].sort();

  const client = await pool.connect();
  let discardClient = false;

  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");

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
    await client.query("COMMIT");
    return { importedCount, updatedCount, skippedOverrideCount, total };
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

export async function listTickets(filters, { page, limit, offset }) {
  const { rows, total } = await findTickets({ ...filters, limit, offset }, pool);
  return paginated(rows.map(toTicket), page, limit, total);
}

export async function getTicketDetail(id) {
  const row = await findTicketWithEvents(id, pool);
  if (!row) throw notFound("Ticket not found");

  const events = row.events.map((event) =>
    toTicketEvent({ ...event, created_at: new Date(event.created_at) })
  );

  return { ticket: toTicket(row), events };
}