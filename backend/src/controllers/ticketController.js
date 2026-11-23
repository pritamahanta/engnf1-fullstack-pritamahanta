import { z } from "zod";
import { parse, parseId } from "../utils/validate.js";
import { parsePagination } from "../utils/pagination.js";
import { getTicketDetail, importTickets, listTickets, updateTicket } from "../services/ticketService.js";

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

const status = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
const category = z.enum(["BILLING", "BUG", "FEATURE_REQUEST", "LOGIN", "DELIVERY"]);
const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const ticketFiltersSchema = z.object({
  status: status.optional(),
  category: category.optional(),
  priority: priority.optional(),
  q: z.string().trim().optional(),
});

const ticketPatchSchema = z.strictObject({
  status: status.optional(),
  category: category.optional(),
  priority: priority.optional(),
  assigneeId: z.number().int().min(1).max(2147483647).nullable().optional(),
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

export async function patchTicket(req, res) {
  const id = parseId(req.params.id);
  const actor = req.get("X-Agent")?.trim() || req.user.email;
  const result = await updateTicket(id, () => parse(ticketPatchSchema, req.body), actor);
  res.json(result);
}
