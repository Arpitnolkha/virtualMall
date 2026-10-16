/** Choose the equivalent bearing nearest the current unbounded 360° yaw. */
export function nearestYaw(target: number, current: number) {
  const turn = Math.PI * 2;
  return (
    current + ((((target - current + Math.PI) % turn) + turn) % turn) - Math.PI
  );
}
export function dragLook(yaw: number, pitch: number, dx: number, dy: number) {
  return {
    yaw: yaw - dx * 0.003,
    pitch: Math.max(-0.6, Math.min(0.55, pitch + dy * 0.002)),
  };
}
