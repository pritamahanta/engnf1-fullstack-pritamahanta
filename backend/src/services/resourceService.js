import {
  findResourceById,
  findResources,
  insertResource,
  updateResource,
} from "../repositories/resourceRepository.js";
import { conflict, notFound } from "../utils/errors.js";
import { toResource } from "../utils/mappers.js";
import { paginated } from "../utils/pagination.js";

export async function listResources(filters, pagination, includeInactive) {
  const { rows, total } = await findResources(filters, pagination, includeInactive);
  return paginated(rows.map(toResource), pagination.page, pagination.limit, total);
}

export async function getResource(id, includeInactive) {
  const row = await findResourceById(id, includeInactive);
  if (!row) throw notFound("Resource not found");
  return toResource(row);
}

export async function createResource(input) {
  return toResource(await writeResource(() => insertResource(input)));
}

export async function patchResource(id, readPatch) {
  const current = await getResource(id, true);
  const patch = readPatch();
  if (Object.keys(patch).length === 0) return current;

  const row = await writeResource(() => updateResource(id, patch));
  if (!row) throw notFound("Resource not found");
  return toResource(row);
}

async function writeResource(write) {
  try {
    return await write();
  } catch (error) {
    if (error.code === "23505" && error.constraint === "resources_name_lower_key") {
      throw conflict("Resource name already exists");
    }
    throw error;
  }
}
