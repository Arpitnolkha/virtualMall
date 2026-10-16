export default function LoadingOverlay({
  stage = "Getting the shop ready...",
}: {
  stage?: string;
}) {
  return (
    <div className="loading-overlay" role="status">
      <div className="loading-mark">
        m<span>✳</span>
      </div>
      <strong>{stage}</strong>
      <span>A little discovery awaits.</span>
    </div>
  );
}
