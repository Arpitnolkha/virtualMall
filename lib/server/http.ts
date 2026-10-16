import "server-only";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new Error("FORBIDDEN");
  let incoming: URL;
  try { incoming = new URL(origin); }
  catch { throw new Error("FORBIDDEN"); }
  const target = new URL(request.url);
  // Next may normalize request.url to localhost. Host retains the browser host.
  const host = request.headers.get("host") ?? target.host;
  if (incoming.host !== host || incoming.protocol !== target.protocol)
    throw new Error("FORBIDDEN");
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    throw new Error("BAD_REQUEST");
  const text = await request.text();
  if (Buffer.byteLength(text) > 4096) throw new Error("BAD_REQUEST");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("BAD_REQUEST");
  }
  if (!value || Array.isArray(value) || typeof value !== "object")
    throw new Error("BAD_REQUEST");
  return value as Record<string, unknown>;
}
export function bearer(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
}
export function reply(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const known: Record<string, [number, string]> = {
    INVALID_TTS_VOICE_CONFIGURATION: [
      503,
      "Voice is not configured correctly. MURF_VOICE_ID must contain only the voice ID (for example Anisha), not a JSON settings object.",
    ],
    CONFIGURATION_REQUIRED: [
      503,
      "Voice is not configured yet. Add the server credentials, then try again.",
    ],
    SESSION_EXPIRED: [
      401,
      "This conversation has ended. Please connect again.",
    ],
    FORBIDDEN: [403, "Please reconnect from this shop."],
    CAPACITY: [429, "Maya is busy right now. Please try again shortly."],
    INVALID_PRODUCT: [400, "Please select a product from the collection."],
    BAD_REQUEST: [400, "That request could not be understood."],
    NOT_READY: [409, "Maya is still getting ready."],
    STALE_SELECTION: [409, "The selected product changed. Please ask again."],
  };
  const [status, message] = known[code] ?? [
    502,
    "Maya could not connect right now. Please try again.",
  ];
  return reply(
    { error: message, code: known[code] ? code : "PROVIDER_ERROR" },
    status,
  );
}
