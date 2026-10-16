import { useMall } from "@/lib/mall/productContext";
export default function VoiceControl({ onEnd }: { onEnd?: () => void }) {
  const {
    voice,
    connectVoice,
    disconnectVoice,
    toggleMute,
    resumeAudio,
    retryAvatar,
  } = useMall();
  const busy = voice.phase === "connecting" || voice.phase === "reconnecting";
  const active = voice.phase === "ready" || voice.phase === "reconnecting";
  if (voice.phase === "disconnected") return (
    <div className="live-voice">
      <button className="voice-main" onClick={() => void connectVoice()}>Talk to Maya</button>
      <span className="preview-label">Allow microphone access to ask questions.</span>
    </div>
  );
  return (
    <div className="live-voice">
      <div className="voice-control">
        <div className="voice-wave voice-wave-left" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        <div className="voice-wave voice-wave-right" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        {voice.autoplayBlocked && (
          <button className="voice-speaker" onClick={resumeAudio} aria-label="Enable Maya’s audio" title="Enable Maya’s audio">♫</button>
        )}
        {(active || busy) && (
          <button className="voice-mute-secondary" disabled={!active} onClick={toggleMute} aria-label={voice.mic === "muted" ? "Unmute microphone" : "Mute microphone"} aria-pressed={voice.mic === "muted"} title={voice.mic === "muted" ? "Unmute microphone" : "Mute microphone"}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 9V6a3 3 0 0 1 6 0v6M5 10v2a7 7 0 0 0 12 5M12 19v3M8 22h8M3 3l18 18" /></svg>
          </button>
        )}
        <button
          className="voice-main"
          disabled={busy}
          onClick={() => {
            if (active) toggleMute();
            else void connectVoice();
          }}
          aria-label={
            active
              ? voice.mic === "muted"
                ? "Unmute microphone"
                : "Mute microphone"
              : "Connect voice to Maya"
          }
          aria-pressed={active ? voice.mic !== "muted" : undefined}
        >
          {active
            ? voice.mic === "muted"
              ? "Unmute"
              : "Mute"
            : busy
              ? "Connecting…"
              : voice.phase === "error"
                ? "Retry voice"
                : "Talk to Maya"}
        </button>
        <span>
          {busy
            ? "Getting Maya ready…"
            : active
              ? voice.mic === "muted"
                ? "Microphone muted"
                : "Microphone on"
              : "Enable your microphone to talk"}
          <small>
            {active
              ? "Live conversation"
              : "Product browsing works without voice"}
          </small>
        </span>
        {(active || busy) && (
          <button
            className="voice-end"
            onClick={() => { onEnd?.(); void disconnectVoice(); }}
            aria-label="End voice conversation"
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 15v-3c0-5 14-5 14 0v3l-4-1v-3M5 15l4-1v-3" /></svg>
            <span>End</span>
          </button>
        )}
      </div>
      {voice.phase === "error" && (
        <button className="voice-retry" onClick={() => { onEnd?.(); void disconnectVoice(); }}>
          Continue browsing preview
        </button>
      )}
      {voice.error && (
        <p className="voice-notice" role="alert">
          {voice.error}
        </p>
      )}
      {voice.notice && (
        <p className="voice-notice" role="status">
          {voice.notice}
        </p>
      )}
      {(voice.avatar === "error" || voice.phase === "error") && (
        <button className="voice-retry" onClick={() => void connectVoice(true)}>
          Try voice without video
        </button>
      )}
      {voice.avatar === "error" && active && (
        <button className="voice-retry" onClick={retryAvatar}>
          Reconnect with Maya’s video
        </button>
      )}
    </div>
  );
}
