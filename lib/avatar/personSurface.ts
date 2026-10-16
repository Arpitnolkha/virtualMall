import { CanvasTexture, SRGBColorSpace, type MeshBasicMaterial } from "three";

/** One worker and at most one frame in flight. Never captures the shopper's camera. */
export function bindPersonSurface(
  source: HTMLImageElement | HTMLVideoElement,
  material: MeshBasicMaterial,
  invalidate: () => void,
  onFailure: () => void,
  onReady?: () => void,
  frostedBackground = false,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | undefined;
  let texture: CanvasTexture | undefined;
  const isVideo = source instanceof HTMLVideoElement;
  let presented = false;
  let skipped = 0;
  material.opacity = 0;
  function fail() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    clearTimeout(timeout);
    worker?.terminate();
    // Retain the last good cutout if processing fails after startup.
    onFailure();
  }
  async function sendFrame() {
    if (stopped) return;
    if (isVideo && (source as HTMLVideoElement).readyState < 2) {
      timer = setTimeout(sendFrame, 100);
      return;
    }
    try {
      const width = isVideo
        ? (source as HTMLVideoElement).videoWidth
        : (source as HTMLImageElement).naturalWidth;
      const height = isVideo
        ? (source as HTMLVideoElement).videoHeight
        : (source as HTMLImageElement).naturalHeight;
      const scale = Math.min(1, 512 / Math.max(width, height));
      const frame = await createImageBitmap(source, {
        resizeWidth: Math.max(1, Math.round(width * scale)),
        resizeHeight: Math.max(1, Math.round(height * scale)),
      });
      if (stopped) {
        frame.close();
        return;
      }
      worker!.postMessage({ type: "frame", frame }, [frame]);
      timeout = setTimeout(fail, 15000);
    } catch {
      fail();
    }
  }
  try {
    if (!context || typeof OffscreenCanvas === "undefined")
      throw new Error("Canvas unsupported");
    worker = new Worker("/avatar-person-worker.js");
    timeout = setTimeout(fail, 20000);
    worker.onerror = fail;
    worker.onmessage = ({ data }) => {
      if (stopped) {
        data.frame?.close();
        return;
      }
      clearTimeout(timeout);
      if (data.type === "ready") {
        void sendFrame();
        return;
      }
      if (data.type === "error") {
        fail();
        return;
      }
      if (data.type === "skip") {
        if (!isVideo || ++skipped > 120) fail();
        else timer = setTimeout(sendFrame, 80);
        return;
      }
      const frame: ImageBitmap = data.frame;
      if (!frame) return;
      if (!texture || canvas.width !== frame.width || canvas.height !== frame.height) {
        texture?.dispose();
        canvas.width = frame.width;
        canvas.height = frame.height;
        texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frame, 0, 0);
      frame.close();
      texture!.needsUpdate = true;
      material.opacity = 1;
      skipped = 0;
      if (!presented) {
        presented = true;
        onReady?.();
      }
      invalidate();
      // Backpressure limits processing to ~12fps, with no accumulating frame queue.
      if (isVideo) timer = setTimeout(sendFrame, 80);
      else worker?.terminate();
    };
    worker.postMessage({ type: "init", isVideo, frostedBackground });
  } catch {
    fail();
  }
  return () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(timeout);
    worker?.terminate();
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
    }
    texture?.dispose();
  };
}
