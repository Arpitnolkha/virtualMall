import { useMall } from "@/lib/mall/productContext";
import TranscriptMock from "./TranscriptMock";
import VoiceControl from "./VoiceControl";
export default function ConversationPanel({ onEnd }: { onEnd?: () => void }) {
  const { state } = useMall();
  return (
    <section
      className="conversation-panel"
      aria-labelledby="conversation-title"
    >
      <div className="conversation-heading">
        <div className="portrait" aria-hidden="true">
          M
        </div>
        <div>
          <h2 id="conversation-title">Maya <small className="shopkeeper-role">Your AI Shopkeeper</small></h2>
          <p>
            <span className={`status-dot ${state.avatarState}`} />
            <span data-testid="avatar-state">
              {state.avatarState === "idle"
                ? "Ready"
                : state.avatarState === "listening"
                  ? "Listening"
                : state.avatarState === "error"
                  ? "Video unavailable · voice controls below"
                : state.avatarState === "speaking"
                  ? "Speaking"
                  : state.avatarState === "thinking"
                    ? "Thinking…"
                    : state.avatarState === "greeting"
                      ? "Hello, welcome in!"
                      : state.avatarState === "loading"
                        ? "Connecting…"
                        : "Here to help"}
            </span>
          </p>
        </div>
        <span className="conversation-spark" aria-hidden="true">
          ✳
        </span>
      </div>
      <TranscriptMock messages={state.messages} />
      <VoiceControl onEnd={onEnd} />
    </section>
  );
}
