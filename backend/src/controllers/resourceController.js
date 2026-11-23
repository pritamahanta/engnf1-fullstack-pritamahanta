import { z } from "zod";
import * as resources from "../services/resourceService.js";
import { parsePagination } from "../utils/pagination.js";
import { parse, parseId } from "../utils/validate.js";

const type = z.enum(["ROOM", "LAB", "EQUIPMENT"]);
const fields = {
  name: z.string().trim().min(3).max(60),
  type,
  capacity: z.number().int().min(1).max(500),
  description: z.string().max(300).nullable().optional(),
};
const createSchema = z.strictObject(fields);
const patchSchema = createSchema.extend({ isActive: z.boolean() }).partial();
const listSchema = z.object({
  search: z.string().trim().optional(),
  type: type.optional(),
  minCapacity: z.coerce.number().int().min(1).max(500).optional(),
});

export async function listResources(req, res) {
  const filters = parse(listSchema, req.query);
  const pagination = parsePagination(req.query);
  res.json(await resources.listResources(filters, pagination, req.user.role === "ADMIN"));
}

export async function getResource(req, res) {
  const id = parseId(req.params.id);
  res.json(await resources.getResource(id, req.user.role === "ADMIN"));
}

export async function createResource(req, res) {
  const input = parse(createSchema, req.body);
  res.status(201).json(await resources.createResource(input));
}

export async function patchResource(req, res) {
  const id = parseId(req.params.id);
  res.json(await resources.patchResource(id, () => parse(patchSchema, req.body)));
}
