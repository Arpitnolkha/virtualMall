import { ChunkedMessageAssembler } from "agora-agent-client-toolkit";
import {
  validateTranscript,
  type TranscriptStreamEvent,
} from "./transcriptStream";
// Wire framing and object fields are verified against toolkit 2.10.0.
export class RtcTranscriptDecoder {
  private chunks = new ChunkedMessageAssembler(10000, 32, false);
  private finals = new Set<string>();
  private sequences = new Map<string, number>();
  constructor(private conversationId: string) {}
  decode(bytes: Uint8Array): TranscriptStreamEvent | null {
    try {
      if (bytes.byteLength > 65536) return null;
      const text = new TextDecoder().decode(bytes);
      let v: unknown;
      if (text.trimStart().startsWith("{")) v = JSON.parse(text);
      else {
        const parts = text.split("|");
        if (
          parts.length !== 4 ||
          !parts[0] ||
          parts[0].length > 128 ||
          !/^\d+$/.test(parts[1]) ||
          Number(parts[1]) < 1 ||
          Number(parts[1]) > 128 ||
          (parts[2] !== "???" &&
            (!/^\d+$/.test(parts[2]) ||
              Number(parts[2]) < 1 ||
              Number(parts[2]) > 128 ||
              Number(parts[1]) > Number(parts[2])))
        )
          return null;
        v = this.chunks.assemble(text);
      }
      if (validateTranscript(v))
        return v.conversationId && v.conversationId !== this.conversationId
          ? null
          : this.accept({ ...v, conversationId: this.conversationId });
      if (!v || typeof v !== "object") return null;
      const m = v as Record<string, unknown>;
      const speaker =
        m.object === "user.transcription"
          ? "user"
          : m.object === "assistant.transcription"
            ? "agent"
            : null;
      if (
        !speaker ||
        typeof m.text !== "string" ||
        m.text.length > 16000 ||
        !Number.isSafeInteger(m.turn_id) ||
        !Number.isSafeInteger(m.stream_id) ||
        typeof m.user_id !== "string"
      )
        return null;
      if (speaker === "user" && typeof m.final !== "boolean") return null;
      if (
        speaker === "agent" &&
        m.turn_status !== 0 &&
        m.turn_status !== 1 &&
        m.turn_status !== 2
      )
        return null;
      const messageId = `${this.conversationId}:${speaker}:${m.user_id}:${m.stream_id}:${m.turn_id}`;
      if (typeof m.turn_seq_id === "number") {
        const prev = this.sequences.get(messageId);
        if (prev !== undefined && m.turn_seq_id < prev) return null;
        this.sequences.set(messageId, m.turn_seq_id);
        if (this.sequences.size > 4000)
          this.sequences.delete(this.sequences.keys().next().value!);
      }
      return this.accept({
        version: 1,
        type: "transcript",
        speaker,
        text: m.text,
        final: speaker === "user" ? (m.final as boolean) : m.turn_status !== 0,
        messageId,
        timestamp: Date.now(),
        conversationId: this.conversationId,
      });
    } catch {
      return null;
    }
  }
  private accept(e: TranscriptStreamEvent) {
    if (this.finals.has(`${e.speaker}:${e.messageId}`)) return null;
    if (e.final) {
      this.finals.add(`${e.speaker}:${e.messageId}`);
      if (this.finals.size > 4000)
        this.finals.delete(this.finals.values().next().value!);
    }
    return e;
  }
  clear() {
    this.chunks.clear();
    this.finals.clear();
    this.sequences.clear();
  }
}
