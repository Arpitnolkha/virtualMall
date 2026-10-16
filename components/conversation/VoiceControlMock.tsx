export default function VoiceControlMock() {
  return (
    <div className="voice-control">
      <button
        disabled
        aria-label="Microphone unavailable. Voice coming in Pass 2."
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
        </svg>
      </button>
      <span>
        Voice coming in Pass 2
        <small>Explore with suggested questions for now</small>
      </span>
      <span className="mock-badge">DEMO</span>
    </div>
  );
}
