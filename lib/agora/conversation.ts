import type { MallProduct } from "@/types/mall";
import type { AvatarState } from "@/lib/avatar/shopkeeperAvatar";
import { AnamShopkeeperController } from "@/lib/avatar/anamShopkeeper";
import { RtcSession, type RtcCredentials } from "./rtcSession";
import type { TranscriptStreamEvent } from "./transcriptStream";
import { LatencyClock, type Timings } from "@/lib/latency/metrics";
export interface VoiceStatus {
  phase: "disconnected" | "connecting" | "ready" | "reconnecting" | "error";
  mic: "permission-required" | "connecting" | "listening" | "muted" | "error";
  avatar: "placeholder" | "loading" | "ready" | "error";
  agent: "idle" | "starting" | "ready" | "error";
  error: string | null;
  notice: string | null;
  autoplayBlocked: boolean;
  agentSpeaking: boolean;
}
export const initialVoiceStatus: VoiceStatus = {
  phase: "disconnected",
  mic: "permission-required",
  avatar: "placeholder",
  agent: "idle",
  error: null,
  notice: null,
  autoplayBlocked: false,
  agentSpeaking: false,
};
export interface LiveSink {
  status: (patch: Partial<VoiceStatus>) => void;
  avatar: (s: AvatarState) => void;
  video: (v: HTMLVideoElement | null) => void;
  transcript: (e: TranscriptStreamEvent) => void;
  clear: () => void;
  timing: (t: Timings) => void;
}
export class AgoraConversationController {
  private rtc: RtcSession | null = null;
  private avatar: AnamShopkeeperController;
  private session: RtcCredentials | null = null;
  private key = crypto.randomUUID();
  private disposed = false;
  private pending: Promise<void> | null = null;
  private cancelStartup: (() => void) | null = null;
  private product: MallProduct | null = null;
  private version = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private expiry: ReturnType<typeof setTimeout> | null = null;
  private avatarTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopping: Promise<void> | null = null;
  private ready = false;
  private contextBusy = false;
  private muted = false;
  private clock: LatencyClock;
  private awaitingReply = false;
  private avatarReady = false;
  private lastLocal = false;
  private lastRemote = false;
  constructor(
    private sink: LiveSink,
    debug: boolean,
    private audioOnly = false,
  ) {
    this.clock = new LatencyClock(debug, sink.timing);
    this.avatar = new AnamShopkeeperController(sink.avatar, (v) => {
      sink.video(v);
      if (v) {
        this.avatarReady = true;
        this.clock.mark("avatarReadyAt", true);
        sink.status({ avatar: "ready" });
        if (this.avatarTimeout) clearTimeout(this.avatarTimeout);
      }
    });
  }
  private async api(data: Record<string, unknown>) {
    if (!this.session) throw new Error("Please connect to Maya first.");
    return this.request(`/api/mall/sessions/${this.session.id}`, data);
  }
  private async request(url: string, data: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "Maya could not connect. Please retry.");
    return result;
  }
  connect() {
    if (this.disposed) return Promise.resolve();
    if (this.pending) return this.pending;
    if (this.ready) return Promise.resolve();
    // SDK/browser negotiation can stall without rejecting. Keep retry available.
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<void>(resolve => {
      this.cancelStartup = resolve;
      timer = setTimeout(() => {
        this.fail("Maya took too long to connect. Please retry, or try voice without video.");
        resolve();
      }, 45000);
    });
    this.pending = Promise.race([this.start(), deadline]).finally(() => {
      clearTimeout(timer);
      this.cancelStartup = null;
      this.pending = null;
    });
    return this.pending;
  }
  private async start() {
    this.sink.status({
      phase: "connecting",
      mic: "connecting",
      agent: "starting",
      error: null,
      notice: null,
    });
    this.clock.mark("connectionStartedAt");
    try {
      const session = (await this.request("/api/mall/sessions", {
        key: this.key,
        audioOnly: this.audioOnly,
      })) as RtcCredentials;
      this.session = session;
      if (this.disposed) {
        await this.stopServer();
        return;
      }
      this.clock.mark("avatarInitStartedAt");
      await this.avatar.initialize();
      if (this.disposed) return;
      this.sink.status({
        avatar: session.avatarEnabled ? "loading" : "placeholder",
      });
      this.rtc = new RtcSession(
        session,
        {
          transcript: (e) => this.transcript(e),
          video: (track) => {
            if (this.disposed) return;
            if (track) void this.avatar.attach(track);
            else {
              this.avatar.detach();
              this.sink.status({
                avatar: session.avatarEnabled ? "error" : "placeholder",
              });
            }
          },
          connection: (s) => {
            if (this.disposed) return;
            if (s === "RECONNECTING")
              this.sink.status({
                phase: "reconnecting",
                notice: "Reconnecting to Maya…",
              });
            if (s === "CONNECTED" && this.ready)
              this.sink.status({ phase: "ready", notice: null });
            if (s === "DISCONNECTED" && this.ready)
              this.fail("The connection ended. Please connect again.");
          },
          activity: (l, a) => this.activity(l, a),
          audio: (playing) => {
            this.clock.mark("firstTtsAudioAt", true);
            if (playing) this.clock.mark("audioPlaybackStartedAt", true);
          },
          error: (m) => this.fail(m),
          autoplay: () => {
            if (!this.disposed) this.sink.status({ autoplayBlocked: true });
          },
        },
        async () => {
          const result = await this.api({ action: "token" });
          return result.token;
        },
      );
      this.clock.mark("rtcJoinStartedAt");
      this.sink.clear();
      // The server already assigned channel and UIDs. Provision Maya while the
      // browser joins, but do not greet until BOTH sides are ready.
      this.clock.mark("agentStartStartedAt");
      await Promise.all([
        this.rtc.join().then(() => this.clock.mark("rtcJoinedAt")),
        this.api({ action: "start" }),
      ]);
      if (!this.disposed) await this.rtc.waitForAgent();
      if (this.disposed) {
        await this.stopServer();
        return;
      }
      this.ready = true;
      this.clock.mark("agentReadyAt");
      this.sink.status({ phase: "ready", mic: "listening", agent: "ready" });
      this.avatar.setState(
        this.lastLocal ? "listening" : this.lastRemote ? "speaking" : "idle",
      );
      if (session.avatarEnabled && !this.avatarReady)
        this.avatarTimeout = setTimeout(() => {
          this.sink.status({
            avatar: "error",
            notice: "Maya’s video is unavailable. You can continue by voice.",
          });
        }, 15000);
      this.expiry = setTimeout(
        () =>
          this.fail(
            "This 30-minute demo session has ended. Connect again to continue.",
          ),
        Math.max(0, session.expiresAt - Date.now()),
      );
      if (this.product) this.selectProduct(this.product, true);
      else {
        try {
          await this.api({ action: "welcome" });
        } catch {
          if (!this.disposed)
            this.sink.status({ notice: "Welcome! Select a product to start exploring with Maya." });
        }
      }
    } catch (e) {
      if (this.disposed) return;
      const text = e instanceof Error ? e.message : "";
      const denied = /PERMISSION|NotAllowed|denied/i.test(text);
      this.fail(
        denied
          ? "Microphone access was denied. Enable it in your browser’s site settings, then retry."
          : text.startsWith("Voice is not configured")
            ? text
            : "Maya could not connect. Check the connection and configuration, then retry.",
      );
    }
  }
  selectProduct(product: MallProduct | null, force = false) {
    if (!force && this.product?.id === product?.id) return;
    this.product = product;
    this.version++;
    this.clock.mark("productClickedAt");
    if (this.timer) clearTimeout(this.timer);
    if (!this.ready) return;
    const version = this.version;
    this.contextBusy = true;
    this.rtc?.suppress(true);
    this.avatar.stopSpeaking();
    this.timer = setTimeout(() => {
      void this.updateContext(product, version);
    }, 180);
  }
  private async updateContext(product: MallProduct | null, version: number) {
    try {
      const result = await this.api({
        action: "context",
        productId: product?.id ?? null,
        version,
      });
      if (this.disposed || version !== this.version) return;
      if (!result.applied) return;
      this.clock.mark("productContextUpdatedAt");
      this.contextBusy = false;
      this.rtc?.suppress(false);
      this.sink.status({ notice: null });
      if (product) {
        try {
          await this.api({ action: "introduce", version });
        } catch {
          if (!this.disposed && version === this.version)
            this.sink.status({notice: "Maya couldn’t introduce this product. You can still ask about it."});
        }
      }
    } catch {
      if (this.disposed || version !== this.version) return;
      this.sink.status({
        notice:
          "Maya could not load that product’s context. Select it again or reconnect. Voice playback is paused to avoid outdated answers.",
      });
      this.product = null;
    }
  }
  async shoppingFeedback(text: string) {
    if (!this.ready || this.contextBusy || this.disposed) throw new Error("Maya is not ready.");
    await this.api({ action: "shopping-feedback", text, version: this.version });
  }
  async ask(question: string) {
    if (!this.ready || this.contextBusy) {
      this.sink.status({
        notice: "Please wait for Maya to load the selected product.",
      });
      return;
    }
    try {
      await this.api({ action: "ask", text: question, version: this.version });
    } catch {
      this.sink.status({
        notice: "Maya could not receive that question. Please try again.",
      });
    }
  }
  private transcript(event: TranscriptStreamEvent) {
    if (this.disposed || event.conversationId !== this.session?.id) return;
    if (event.speaker === "agent" && this.contextBusy) return;
    if (event.speaker === "user") {
      this.clock.mark(event.final ? "finalAsrAt" : "firstAsrPartialAt", true);
      if (event.final && !this.lastRemote) {
        this.awaitingReply = true;
        this.avatar.setState("thinking");
      }
    }
    this.sink.transcript(event);
  }
  private activity(local: boolean, remote: boolean) {
    if (this.disposed) return;
    if (local && !this.lastLocal) {
      this.clock.resetTurn();
      this.clock.mark("speechStartedAt");
    }
    if (!local && this.lastLocal) {
      this.clock.mark("speechEndedAt");
      this.awaitingReply = true;
    }
    if (remote) this.awaitingReply = false;
    if (remote !== this.lastRemote) this.sink.status({ agentSpeaking: remote });
    this.lastLocal = local;
    this.lastRemote = remote;
    this.avatar.setState(
      local
        ? "listening"
        : remote
          ? "speaking"
          : this.awaitingReply
            ? "thinking"
            : "idle",
    );
  }
  async toggleMute() {
    const next = !this.muted;
    try {
      await this.rtc?.setMuted(next);
      this.muted = next;
      this.sink.status({ mic: next ? "muted" : "listening" });
    } catch {
      this.sink.status({
        error: "The microphone could not be changed. Please reconnect.",
      });
    }
  }
  resumeAudio() {
    this.rtc?.resume();
    this.sink.status({ autoplayBlocked: false });
  }
  async retryAvatar() {
    this.sink.status({
      notice:
        "Avatar provisioning belongs to the agent session. Disconnect and reconnect to retry Maya’s video; the shop selection will be kept.",
    });
  }
  async handoff(humanUid: number) {
    this.rtc?.suppress(true);
    this.avatar.stopSpeaking();
    await this.api({ action: "passive" });
    this.rtc?.authorizeHuman(humanUid);
    this.rtc?.suppress(false);
  }
  private fail(message: string) {
    if (this.disposed) return;
    this.ready = false;
    this.sink.status({
      phase: "error",
      mic: "error",
      agent: "error",
      error: message,
    });
    this.avatar.setState("error");
    // A failed controller is terminal; retries create a fresh instance.
    this.disposed = true;
    this.cancelStartup?.();
    void this.teardown();
  }
  private async stopServer() {
    if (!this.session) return;
    await fetch(`/api/mall/sessions/${this.session.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({ action: "stop" }),
      keepalive: true,
    }).catch(() => {});
  }
  private teardown() {
    if (this.stopping) return this.stopping;
    this.stopping = this.cleanup();
    return this.stopping;
  }
  private async cleanup() {
    if (this.timer) clearTimeout(this.timer);
    if (this.expiry) clearTimeout(this.expiry);
    if (this.avatarTimeout) clearTimeout(this.avatarTimeout);
    await this.rtc?.dispose();
    this.avatar.dispose();
    await this.stopServer();
  }
  async dispose() {
    this.cancelStartup?.();
    this.disposed = true;
    this.ready = false;
    await this.teardown();
  }
}
