import {
  getSession,
  shoppingFeedback,
  startAgent,
  stopSession,
  updateProduct,
  introduceProduct,
  welcomeShowroom,
  askAgent,
  tokenFor,
  type SessionEntry,
} from "@/lib/server/sessionRegistry";
import { bearer, body, failure, reply, sameOrigin } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session: SessionEntry | undefined;
  let action: unknown;
  try {
    sameOrigin(request);
    const { id } = await params;
    const data = await body(request);
    const e = getSession(id, bearer(request), data.action === "stop");
    session = e;
    action = data.action;
    switch (data.action) {
      case "start":
        await startAgent(e);
        console.info("[Maya agent] started", { sessionId: e.id, agentId: e.agent?.id, avatarEnabled: e.avatarEnabled });
        return reply({
          ready: Boolean(e.agent?.id),
          agentId: e.agent?.id ?? null,
          avatarEnabled: e.avatarEnabled,
        });
      case "context":
        if (
          (data.productId !== null && typeof data.productId !== "string") ||
          typeof data.version !== "number" ||
          !Number.isSafeInteger(data.version) ||
          data.version < 1
        )
          throw new Error("BAD_REQUEST");
        return reply(
          await updateProduct(e, data.productId as string | null, data.version),
        );
      case "introduce":
        if (typeof data.version !== "number" || !Number.isSafeInteger(data.version) || data.version < 1)
          throw new Error("BAD_REQUEST");
        return reply(await introduceProduct(e, data.version));
      case "welcome":
        return reply(await welcomeShowroom(e));
      case "ask":
        if (
          typeof data.text !== "string" ||
          !data.text.trim() ||
          data.text.length > 1000 ||
          typeof data.version !== "number"
        )
          throw new Error("BAD_REQUEST");
        await askAgent(e, data.text, data.version);
        return reply({ ok: true });
      case "shopping-feedback":
        if (typeof data.text !== "string" || !data.text.trim() || Buffer.byteLength(data.text) > 512 || !Number.isSafeInteger(data.version)) throw new Error("BAD_REQUEST");
        await shoppingFeedback(e, data.text, data.version as number);
        return reply({ok:true});
      case "interrupt":
        await e.agent?.interrupt();
        return reply({ ok: true });
      case "token":
        return reply({ token: tokenFor(e) });
      case "passive":
        await e.agent?.stop();
        e.agent = undefined;
        return reply({ ok: true });
      case "stop":
        await stopSession(e);
        return reply({ ok: true });
      default:
        throw new Error("BAD_REQUEST");
    }
  } catch (e) {
    if (session?.agent && e && typeof e === "object" && "statusCode" in e) {
      console.warn("[Maya agent] provider request failed", {
        agentId: session.agent.id,
        action: typeof action === "string" ? action.slice(0,32) : "unknown",
        httpStatus: typeof e.statusCode === "number" ? e.statusCode : null,
      });
    }
    return failure(e);
  }
}
