export const timingNames = [
  "mallLoadedAt",
  "connectionStartedAt",
  "avatarInitStartedAt",
  "avatarReadyAt",
  "rtcJoinStartedAt",
  "rtcJoinedAt",
  "agentStartStartedAt",
  "agentReadyAt",
  "productClickedAt",
  "productContextUpdatedAt",
  "speechStartedAt",
  "speechEndedAt",
  "firstAsrPartialAt",
  "finalAsrAt",
  "llmStartedAt",
  "firstLlmTokenAt",
  "ttsStartedAt",
  "firstTtsAudioAt",
  "audioPlaybackStartedAt",
] as const;
export type TimingName = (typeof timingNames)[number];
export type Timings = Partial<Record<TimingName, number>>;
export const metricPairs = [
  ["Connection ready", "connectionStartedAt", "agentReadyAt"],
  ["Avatar startup", "avatarInitStartedAt", "avatarReadyAt"],
  ["RTC join", "rtcJoinStartedAt", "rtcJoinedAt"],
  ["Agent start", "agentStartStartedAt", "agentReadyAt"],
  ["Product context", "productClickedAt", "productContextUpdatedAt"],
  ["ASR final", "speechEndedAt", "finalAsrAt"],
  ["LLM TTFT", "llmStartedAt", "firstLlmTokenAt"],
  ["TTS TTFB", "ttsStartedAt", "firstTtsAudioAt"],
  ["Speech → audio", "speechEndedAt", "audioPlaybackStartedAt"],
] as const;
export function duration(t: Timings, start: TimingName, end: TimingName) {
  return t[start] !== undefined && t[end] !== undefined && t[end]! >= t[start]!
    ? Math.round(t[end]! - t[start]!)
    : null;
}
// Missing provider timestamps stay unavailable. No transcript text or audio enters metrics.
export class LatencyClock {
  values: Timings = {};
  constructor(
    private enabled: boolean,
    private notify: (t: Timings) => void,
  ) {}
  mark(name: TimingName, first = false) {
    if (!this.enabled || (first && this.values[name] !== undefined)) return;
    this.values = { ...this.values, [name]: performance.now() };
    this.notify(this.values);
  }
  resetTurn() {
    for (const key of [
      "speechStartedAt",
      "speechEndedAt",
      "firstAsrPartialAt",
      "finalAsrAt",
      "llmStartedAt",
      "firstLlmTokenAt",
      "ttsStartedAt",
      "firstTtsAudioAt",
      "audioPlaybackStartedAt",
    ] as TimingName[])
      delete this.values[key];
  }
}
