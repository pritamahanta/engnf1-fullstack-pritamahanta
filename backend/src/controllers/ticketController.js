import { z } from "zod";
import { parse, parseId } from "../utils/validate.js";
import { parsePagination } from "../utils/pagination.js";
import { getTicketDetail, importTickets, listTickets } from "../services/ticketService.js";

const importSchema = z.object({
  tickets: z.array(
    z.object({
      externalId: z
        .string()
        .refine((value) => value.trim().length > 0, "External ID is required"),
      subject: z.string().trim().min(3).max(150),
      body: z.string().trim().min(5).max(2000),
    })
  ),
});

const ticketFiltersSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  category: z.enum(["BILLING", "BUG", "FEATURE_REQUEST", "LOGIN", "DELIVERY"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  q: z.string().trim().optional(),
});

export async function importFeed(req, res) {
  const { tickets } = parse(importSchema, req.body);
  const result = await importTickets(tickets);
  res.json(result);
}

export async function getTickets(req, res) {
  const filters = parse(ticketFiltersSchema, req.query);
  const pagination = parsePagination(req.query, { allowLimit: true });
  const result = await listTickets(filters, pagination);
  res.json(result);
}

export async function getTicket(req, res) {
  const id = parseId(req.params.id);
  res.json(await getTicketDetail(id));
}