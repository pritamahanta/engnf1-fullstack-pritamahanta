import { validationError, notFound } from "./errors.js";

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    throw validationError(field ? `${field}: ${issue.message}` : issue.message);
  }
  return result.data;
}

export function parseId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) {
    throw notFound();
  }
  return Number(value);
}