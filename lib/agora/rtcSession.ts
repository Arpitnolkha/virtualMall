import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { RtcTranscriptDecoder } from "./transcriptDecoder";
import type { TranscriptStreamEvent } from "./transcriptStream";
// Download/parse only: no client, permission prompt, microphone or paid session.
let sdkPromise: Promise<typeof import("agora-rtc-sdk-ng")> | null = null;
export function preloadRtcSdk() {
  if (!sdkPromise) sdkPromise = import("agora-rtc-sdk-ng").catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}
export interface RtcCredentials {
  id: string;
  appId: string;
  channel: string;
  uid: number;
  agentUid: number;
  avatarUid: number;
  token: string;
  avatarEnabled: boolean;
  expiresAt: number;
}
export interface RtcSink {
  transcript: (e: TranscriptStreamEvent) => void;
  video: (track: MediaStreamTrack | null) => void;
  connection: (state: string) => void;
  activity: (local: boolean, remote: boolean) => void;
  audio: (playing: boolean) => void;
  error: (message: string) => void;
  autoplay: () => void;
}
export class RtcSession {
  private client: IAgoraRTCClient | null = null;
  private mic: IMicrophoneAudioTrack | null = null;
  private decoder: RtcTranscriptDecoder;
  private tracks = new Map<string, IRemoteAudioTrack>();
  private owner: IRemoteAudioTrack | null = null;
  private disposed = false;
  private suppressed = false;
  private muted = false;
  private localActive = false;
  private remoteActive = false;
  private remoteAt = -Infinity;
  private micAt = -Infinity;
  private autoplayBlocked = false;
  private humanUid: number | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private agentPresent = false;
  private agentWaiter: (() => void) | null = null;
  private agentWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private renewal: Promise<void> | null = null;
  private sdk: (typeof import("agora-rtc-sdk-ng"))["default"] | null = null;
  constructor(
    private credentials: RtcCredentials,
    private sink: RtcSink,
    private renew: () => Promise<string>,
  ) {
    this.decoder = new RtcTranscriptDecoder(credentials.id);
  }
  async join() {
    const { default: AgoraRTC } = await preloadRtcSdk();
    if (this.disposed) return;
    this.sdk = AgoraRTC;
    AgoraRTC.setLogLevel(4);
    AgoraRTC.disableLogUpload();
    AgoraRTC.onAutoplayFailed = this.autoplayFailure;
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    this.client = client;
    client.on("user-joined", this.userJoined);
    client.on("stream-message", this.stream);
    client.on("user-published", this.published);
    client.on("user-unpublished", this.unpublished);
    client.on("user-left", this.left);
    client.on("connection-state-change", this.connection);
    client.on("token-privilege-will-expire", this.renewToken);
    client.on("token-privilege-did-expire", this.renewToken);
    // User selected a product or explicitly retried before this path. Failure closes the mic.
    const mic = await AgoraRTC.createMicrophoneAudioTrack({
      AEC: true,
      ANS: true,
      AGC: true,
    });
    if (this.disposed) {
      mic.stop();
      mic.close();
      return;
    }
    this.mic = mic;
    await client.join(
      this.credentials.appId,
      this.credentials.channel,
      this.credentials.token,
      this.credentials.uid,
    );
    if (this.disposed) {
      await client.leave().catch(() => {});
      return;
    }
    await client.publish([mic]);
    if (this.disposed) {
      await client.leave().catch(() => {});
      return;
    }
    this.interval = setInterval(this.sample, 100);
  }
  waitForAgent() {
    if (this.disposed || this.agentPresent) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.agentWaiter = resolve;
      this.agentWaitTimer = setTimeout(() => {
        this.agentWaiter = null;
        reject(
          new Error("Maya could not join the conversation. Please retry."),
        );
      }, 20000);
    });
  }
  private userJoined = (user: IAgoraRTCRemoteUser) => {
    if (!this.disposed) console.info("[Maya RTC] peer joined " + JSON.stringify({ uid: user.uid }));
    if (this.allowed(user.uid)) {
      this.agentPresent = true;
      if (this.agentWaitTimer) clearTimeout(this.agentWaitTimer);
      this.agentWaiter?.();
      this.agentWaiter = null;
    }
  };
  authorizeHuman(uid: number) {
    this.humanUid = uid;
  }
  private autoplayFailure = () => {
    this.autoplayBlocked = true;
    this.sink.autoplay();
  };
  private allowed(uid: string | number) {
    return (
      String(uid) === String(this.humanUid) ||
      String(uid) === String(this.credentials.agentUid) ||
      String(uid) === String(this.credentials.avatarUid)
    );
  }
  private stream = (uid: string | number, bytes: Uint8Array) => {
    if (this.disposed || !this.allowed(uid)) return;
    const e = this.decoder.decode(bytes);
    if (e && !(this.suppressed && e.speaker === "agent"))
      this.sink.transcript(e);
  };
  private published = async (
    user: IAgoraRTCRemoteUser,
    type: "audio" | "video" | "datachannel",
  ) => {
    if (this.disposed || !this.allowed(user.uid) || type === "datachannel")
      return;
    try {
      const client = this.client;
      if (!client) return;
      console.info("[Maya RTC] published " + JSON.stringify({ uid: user.uid, type }));
      await client.subscribe(user, type);
      console.info("[Maya RTC] subscribed " + JSON.stringify({ uid: user.uid, type }));
      if (this.disposed) return;
      this.userJoined(user);
      if (type === "video" && user.videoTrack)
        this.sink.video(user.videoTrack.getMediaStreamTrack());
      if (type === "audio" && user.audioTrack) {
        this.tracks.set(String(user.uid), user.audioTrack);
        this.chooseAudio();
      }
    } catch (error) {
      console.warn("[Maya RTC] subscription failed", { uid: user.uid, type, code: error && typeof error === "object" && "code" in error ? String(error.code).slice(0,80) : "UNKNOWN" });
      if (!this.disposed)
        this.sink.error(
          "A media connection was interrupted. Please retry the conversation.",
        );
    }
  };
  private unpublished = (
    user: IAgoraRTCRemoteUser,
    type: "audio" | "video",
  ) => {
    if (!this.allowed(user.uid)) return;
    if (type === "audio") {
      this.tracks.get(String(user.uid))?.stop();
      this.tracks.delete(String(user.uid));
      this.chooseAudio();
    }
    if (type === "video") this.sink.video(null);
  };
  private left = (user: IAgoraRTCRemoteUser) => {
    if (this.disposed) return;
    console.info("[Maya RTC] peer left " + JSON.stringify({ uid: user.uid }));
    this.unpublished(user, "audio");
    this.unpublished(user, "video");
    if (String(user.uid) === String(this.credentials.agentUid)) {
      this.agentPresent = false;
      this.sink.error("Maya disconnected. Please reconnect to continue.");
    }
  };
  private connection = (state: string) => {
    if (!this.disposed) this.sink.connection(state);
  };
  private renewToken = () => {
    if (this.renewal || this.disposed) return;
    this.renewal = this.renew()
      .then(async (token) => {
        if (!this.disposed) await this.client?.renewToken(token);
      })
      .catch(() => {
        if (!this.disposed)
          this.sink.error("The connection expired. Please connect again.");
      })
      .finally(() => {
        this.renewal = null;
      });
  };
  private chooseAudio() {
    const next =
      this.tracks.get(String(this.humanUid)) ??
      this.tracks.get(String(this.credentials.avatarUid)) ??
      this.tracks.get(String(this.credentials.agentUid)) ??
      null;
    if (this.owner === next) return;
    this.owner?.setAudioFrameCallback(null);
    this.owner?.stop();
    this.owner = next;
    this.remoteAt = 0;
    for (const track of this.tracks.values()) if (track !== next) track.stop();
    if (next) {
      next.setAudioFrameCallback((buffer) => {
        if (this.disposed || this.suppressed || this.owner !== next) return;
        const samples = buffer.getChannelData(0);
        let power = 0;
        for (let i = 0; i < samples.length; i += 8)
          power += samples[i] * samples[i];
        if (Math.sqrt(power / (samples.length / 8)) > 0.008) {
          this.remoteAt = performance.now();
          this.sink.audio(next.isPlaying && !this.autoplayBlocked);
        }
      }, 1024);
      if (!this.suppressed) next.play();
    }
  }
  private sample = () => {
    if (this.disposed) return;
    const now = performance.now();
    if (!this.muted && (this.mic?.getVolumeLevel() ?? 0) > 0.035)
      this.micAt = now;
    const local = !this.muted && now - this.micAt < 250;
    const remote =
      !this.suppressed &&
      !this.autoplayBlocked &&
      this.owner?.isPlaying === true &&
      now - this.remoteAt < 250;
    if (local !== this.localActive || remote !== this.remoteActive) {
      this.localActive = local;
      this.remoteActive = remote;
      this.sink.activity(local, remote);
    }
  };
  suppress(value: boolean) {
    this.suppressed = value;
    if (value) {
      this.owner?.stop();
      this.remoteAt = 0;
      this.remoteActive = false;
      this.sink.activity(this.localActive, false);
    } else this.owner?.play();
  }
  resume() {
    this.autoplayBlocked = false;
    this.owner?.play();
  }
  async setMuted(value: boolean) {
    await this.mic?.setEnabled(!value);
    this.muted = value;
    this.sample();
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.agentWaitTimer) clearTimeout(this.agentWaitTimer);
    this.agentWaiter?.();
    this.agentWaiter = null;
    if (this.interval) clearInterval(this.interval);
    this.decoder.clear();
    this.mic?.stop();
    this.mic?.close();
    this.mic = null;
    for (const t of this.tracks.values()) {
      t.setAudioFrameCallback(null);
      t.stop();
    }
    this.tracks.clear();
    this.owner = null;
    this.sink.video(null);
    if (this.sdk?.onAutoplayFailed === this.autoplayFailure)
      this.sdk.onAutoplayFailed = undefined;
    const c = this.client;
    if (c) {
      c.removeAllListeners();
      await c.leave().catch(() => {});
    }
    this.client = null;
  }
}
