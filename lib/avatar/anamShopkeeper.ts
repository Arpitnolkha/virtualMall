import type { AvatarState, ShopkeeperAvatarController } from "./shopkeeperAvatar";

/** Anam supplies video; Agora RTC remains the sole audible playback owner. */
export class AnamShopkeeperController implements ShopkeeperAvatarController {
  private video: HTMLVideoElement | null = null;
  private disposed = false;
  private cancelReady: (() => void) | null = null;
  constructor(
    private state: (s: AvatarState) => void,
    private present: (v: HTMLVideoElement | null) => void,
  ) {}
  async initialize() {
    this.disposed = false;
    this.setState("loading");
  }
  async attach(track: MediaStreamTrack) {
    if (this.disposed) return;
    this.detach();
    const v = document.createElement("video");
    v.id = crypto.randomUUID();
    v.muted = true;
    v.defaultMuted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("aria-hidden", "true");
    v.tabIndex = -1;
    // Keep the media element attached for WebKit's video decoding lifecycle.
    Object.assign(v.style, {position:"fixed",width:"1px",height:"1px",top:"0",left:"0",opacity:"0",pointerEvents:"none"});
    document.body.appendChild(v);
    v.srcObject = new MediaStream([track]);
    this.video = v;
    const ready = this.waitForFrame(v);
    try {
      await v.play();
      if (!(await ready) || this.disposed || this.video !== v) {
        if (!this.disposed && this.video === v) {
          this.detach();
          this.setState("error");
        }
        return;
      }
      this.present(v);
    } catch {
      if (this.video === v) {
        this.detach();
        this.setState("error");
      }
    }
  }
  private waitForFrame(v: HTMLVideoElement) {
    return new Promise<boolean>((resolve) => {
      let frame = 0;
      let finished = false;
      const done = (ready: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        v.removeEventListener("loadeddata", check);
        if (frame) v.cancelVideoFrameCallback(frame);
        this.cancelReady = null;
        resolve(ready);
      };
      const valid = () => v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;
      const check = () => { if (valid()) done(true); };
      const timeout = setTimeout(() => done(false), 12000);
      this.cancelReady = () => done(false);
      if (typeof v.requestVideoFrameCallback === "function") {
        const tick = () => {
          if (valid()) done(true);
          else frame = v.requestVideoFrameCallback(tick);
        };
        frame = v.requestVideoFrameCallback(tick);
      } else {
        v.addEventListener("loadeddata", check);
        check();
      }
    });
  }
  detach() {
    this.cancelReady?.();
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
    this.present(null);
  }
  setState(s: AvatarState) { if (!this.disposed) this.state(s); }
  stopSpeaking() { this.setState("idle"); }
  dispose() { this.disposed = true; this.detach(); }
}
