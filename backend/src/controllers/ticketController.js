import { z } from "zod";
import { parse } from "../utils/validate.js";
import { importTickets } from "../services/ticketService.js";

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

export async function importFeed(req, res) {
  const { tickets } = parse(importSchema, req.body);
  const result = await importTickets(tickets);
  res.json(result);
}