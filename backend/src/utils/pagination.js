import { z } from "zod";
import { parse } from "./validate.js";

export function parsePagination(query, { allowLimit = false, maxLimit = 100 } = {}) {
  const shape = {
    page: z.coerce.number().int().min(1).max(1000000).default(1),
  };
  if (allowLimit) {
    shape.limit = z.coerce.number().int().min(1).max(maxLimit).default(10);
  }

  const parsed = parse(z.object(shape), { page: query.page, limit: query.limit });
  const limit = parsed.limit ?? 10;

  return { page: parsed.page, limit, offset: (parsed.page - 1) * limit };
}

export function paginated(data, page, limit, total) {
  return {
    data,
    page,
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}