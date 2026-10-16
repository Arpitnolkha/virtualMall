import { useMall } from "@/lib/mall/productContext";
import { metricPairs, duration } from "@/lib/latency/metrics";
export default function LatencyPanel() {
  const { debug, timings, voice, state, handoff } = useMall();
  if (!debug) return null;
  return (
    <details className="latency-panel" open>
      <summary>Developer latency</summary>
      <dl>
        <dt>Anam Avatar</dt>
        <dd>{voice.avatar}</dd>
        <dt>RTC</dt>
        <dd>{voice.phase}</dd>
        <dt>Agent</dt>
        <dd>{voice.agent}</dd>
        <dt>Active product</dt>
        <dd>{state.activeProduct?.id ?? "none"}</dd>
        <dt>Handoff</dt>
        <dd>{handoff}</dd>
        {metricPairs.map(([label, start, end]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {duration(timings, start, end) === null
                ? "Unavailable"
                : `${duration(timings, start, end)} ms`}
            </dd>
          </div>
        ))}
      </dl>
      <small>
        Local speech boundaries use audio activity detection. LLM and TTS server
        timings are unavailable on this RTC-only transport; no timings are
        fabricated.
      </small>
    </details>
  );
}
