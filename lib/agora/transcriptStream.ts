export interface TranscriptStreamEvent {
  version: 1;
  type: "transcript";
  speaker: "user" | "agent";
  text: string;
  final: boolean;
  messageId: string;
  timestamp: number;
  conversationId?: string;
  productId?: string;
}
export function validateTranscript(
  value: unknown,
): value is TranscriptStreamEvent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    v.type === "transcript" &&
    (v.speaker === "user" || v.speaker === "agent") &&
    typeof v.text === "string" &&
    v.text.length <= 16000 &&
    typeof v.final === "boolean" &&
    typeof v.messageId === "string" &&
    v.messageId.length > 0 &&
    v.messageId.length < 256 &&
    typeof v.timestamp === "number" &&
    Number.isFinite(v.timestamp) &&
    v.timestamp >= 0 &&
    (v.conversationId === undefined || typeof v.conversationId === "string") &&
    (v.productId === undefined || typeof v.productId === "string")
  );
}
export function parseTranscript(json: string): TranscriptStreamEvent | null {
  try {
    const v: unknown = JSON.parse(json);
    return validateTranscript(v) ? v : null;
  } catch {
    return null;
  }
}
export function upsertTranscript(
  messages: TranscriptStreamEvent[],
  event: TranscriptStreamEvent,
  conversationId: string,
) {
  if (
    !validateTranscript(event) ||
    (event.conversationId !== undefined &&
      event.conversationId !== conversationId)
  )
    return messages;
  const index = messages.findIndex(
    (m) => m.messageId === event.messageId && m.speaker === event.speaker,
  );
  if (index < 0) return [...messages, event].slice(-80);
  if (messages[index].final) return messages;
  const next = [...messages];
  next[index] = event;
  return next;
}
