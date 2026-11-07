export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const configured = process.env.BETTER_AUTH_URL;
  if (!origin || !configured) return false;
  try {
    return origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function smallJson(request: Request, maxCharacters = 4096): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxCharacters * 4) throw new Error("Request too large");
  const raw = await request.text();
  if (raw.length > maxCharacters) throw new Error("Request too large");
  return JSON.parse(raw) as unknown;
}

export function objectBody(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : null;
}
