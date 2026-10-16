import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/types/conversation";
export default function TranscriptMock({
  messages,
}: {
  messages: TranscriptMessage[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);
  return (
    <div
      className="transcript"
      ref={ref}
      role="log"
      aria-label="Conversation with Maya"
      aria-live="polite"
      aria-relevant="additions"
      tabIndex={0}
    >
      {messages.length === 0 && <p className="conversation-empty">Your conversation appears here as you and Maya speak.</p>}
      {messages.map((m) => (
        <div key={m.id} className={`message-row ${m.role}`}>
          {m.role === "maya" && <span className="message-avatar" aria-hidden="true" />}
          <div className={`bubble ${m.role}`}>
          <span>{m.role === "maya" ? "MAYA" : "YOU"}</span>
          <p>
            {m.text}
            {m.final === false && (
              <span className="partial-indicator" aria-label="Transcribing">
                {" "}
                …
              </span>
            )}
          </p>
          </div>
          {m.role === "user" && <span className="message-user-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z"/></svg></span>}
        </div>
      ))}
    </div>
  );
}
