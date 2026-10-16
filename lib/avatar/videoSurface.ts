import { VideoTexture, SRGBColorSpace, type MeshBasicMaterial } from "three";

/** Own the GPU texture and frame callbacks for exactly one effect lifetime. */
export function bindVideoSurface(
  video: HTMLVideoElement,
  material: MeshBasicMaterial,
  invalidate: () => void,
) {
  const texture = new VideoTexture(video);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  material.map = texture;
  material.needsUpdate = true;
  let stopped = false;
  let frame = 0;
  const nativeFrames = typeof video.requestVideoFrameCallback === "function";
  const tick = () => {
    if (stopped) return;
    if (video.readyState >= 2) {
      texture.needsUpdate = true;
      invalidate();
    }
    frame = nativeFrames
      ? video.requestVideoFrameCallback(tick)
      : requestAnimationFrame(tick);
  };
  tick();
  invalidate();
  return () => {
    stopped = true;
    if (nativeFrames) video.cancelVideoFrameCallback(frame);
    else cancelAnimationFrame(frame);
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
    }
    texture.dispose();
  };
}
