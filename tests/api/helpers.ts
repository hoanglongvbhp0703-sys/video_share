import type { APIRequestContext } from "@playwright/test";

// Seeded mock users (password set by set-default-password.mjs: "1234567Long")
export const TEST_USER = { email: "minhtuan@example.com", password: "1234567Long" };
export const TEST_USER_2 = { email: "honganh@example.com", password: "1234567Long" };
// Created by global-setup.ts with a predictable password
export const TEST_ADMIN = { email: "pw_admin@playwright.test", password: "PwAdmin123!" };

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  name?: string,
): Promise<{ token: string; status: number; body: Record<string, unknown> }> {
  const res = await request.post("/api/auth/login", {
    data: name ? { email, password, name } : { email, password },
  });
  const body = await res.json();
  return { token: body.token as string, status: res.status(), body };
}

// ---------------------------------------------------------------------------
// tRPC helpers
// tRPC v11 + superjson: input wrapped in {"json":<data>}
// Response: {"result":{"data":{"json":<data>}}} or {"error":{"json":{...}}}
//
// NOTE: null is a valid result value, so we cannot use `?? undefined` to
// detect "no data". Instead we check whether the `result` key exists.
// ---------------------------------------------------------------------------

function extractTrpc(body: unknown): { data: unknown; error: unknown } {
  const b = body as Record<string, unknown> | null;
  if (!b) return { data: undefined, error: undefined };
  if ("result" in b) {
    const data = (b.result as Record<string, unknown>)?.data;
    const json = (data as Record<string, unknown>)?.json;
    // Pass through null explicitly (valid tRPC result)
    return { data: json !== undefined ? json : null, error: undefined };
  }
  if ("error" in b) {
    const errJson = (b.error as Record<string, unknown>)?.json;
    return { data: undefined, error: errJson };
  }
  return { data: undefined, error: undefined };
}

/** Call a tRPC query (GET). */
export async function tGet(
  request: APIRequestContext,
  procedure: string,
  input: unknown = {},
  token?: string,
): Promise<{ status: number; data: unknown; error: unknown }> {
  const inputStr = encodeURIComponent(JSON.stringify({ json: input }));
  const res = await request.get(`/api/trpc/${procedure}?input=${inputStr}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  return { status: res.status(), ...extractTrpc(body) };
}

/** Call a tRPC mutation (POST). */
export async function tPost(
  request: APIRequestContext,
  procedure: string,
  input: unknown = null,
  token?: string,
): Promise<{ status: number; data: unknown; error: unknown }> {
  const res = await request.post(`/api/trpc/${procedure}`, {
    data: { json: input },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  return { status: res.status(), ...extractTrpc(body) };
}
