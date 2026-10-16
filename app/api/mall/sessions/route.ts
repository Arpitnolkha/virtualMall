import { createSession, publicSession } from "@/lib/server/sessionRegistry";
import { body, failure, reply, sameOrigin } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = await body(request);
    if (typeof data.key !== "string" || !/^[a-f0-9-]{36}$/.test(data.key))
      throw new Error("BAD_REQUEST");
    return reply(
      publicSession(createSession(data.key, data.audioOnly === true)),
    );
  } catch (e) {
    return failure(e);
  }
}
