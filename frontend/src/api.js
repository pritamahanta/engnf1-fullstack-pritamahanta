const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export async function apiRequest(path, { method = "GET", token, body, signal, headers } = {}) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) {
    throw Object.assign(new Error(
      result?.error?.message || (response.ok ? "Expected a JSON response from the API." : `Request failed (${response.status}).`)
    ), { status: response.status, code: result?.error?.code });
  }
  return result;
}
