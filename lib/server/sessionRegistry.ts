import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  Agent,
  AgoraClient,
  Area,
  AresSTT,
  OpenAI,
  MurfTTS,
  AnamAvatar,
  generateRtcToken,
  type AgentSession,
} from "agora-agents";
import { configuration, requireConfiguration } from "./config";
import { products } from "@/lib/mall/products";
import { productIntroduction, systemMessages } from "@/lib/mall/productPayload";
const TTL = 30 * 60 * 1000;
export interface SessionEntry {
  id: string;
  key: string;
  channel: string;
  uid: number;
  agentUid: number;
  avatarUid: number;
  expiresAt: number;
  agent?: AgentSession;
  starting?: Promise<void>;
  closed: boolean;
  version: number;
  productId: string | null;
  queue: Promise<unknown>;
  avatarEnabled: boolean;
  greeted: boolean;
  introducedVersion?: number;
}
const globalRegistry = globalThis as typeof globalThis & {
  mallSessions?: Map<string, SessionEntry>;
};
const sessions = (globalRegistry.mallSessions ??= new Map<
  string,
  SessionEntry
>());
export function createSession(key: string, audioOnly = false) {
  requireConfiguration();
  for (const e of sessions.values()) {
    if (e.expiresAt < Date.now()) {
      void stopSession(e).catch(() => {});
      sessions.delete(e.id);
    } else if (e.key === key && !e.closed) return e;
  }
  if (sessions.size >= 12) throw new Error("CAPACITY");
  const id = randomUUID();
  const e: SessionEntry = {
    id,
    key,
    channel: `mall_${id.replaceAll("-", "")}`,
    uid: 1001,
    agentUid: 2001,
    avatarUid: 3001,
    expiresAt: Date.now() + TTL,
    closed: false,
    version: 0,
    productId: null,
    queue: Promise.resolve(),
    avatarEnabled: !audioOnly && configuration().avatarReady,
    greeted: false,
  };
  sessions.set(id, e);
  return e;
}
export function getSession(id: string, key: string, allowExpired = false) {
  const e = sessions.get(id);
  if (
    !e ||
    e.closed ||
    (!allowExpired && e.expiresAt < Date.now()) ||
    Buffer.byteLength(key) !== Buffer.byteLength(e.key) ||
    !timingSafeEqual(Buffer.from(key), Buffer.from(e.key))
  )
    throw new Error("SESSION_EXPIRED");
  return e;
}
export function tokenFor(e: Pick<SessionEntry, "channel" | "uid">, uid = e.uid) {
  const c = requireConfiguration();
  return generateRtcToken({
    appId: c.appId,
    appCertificate: c.appCertificate,
    channel: e.channel,
    uid,
    expirySeconds: 1800,
  });
}
export function publicSession(e: SessionEntry) {
  return {
    id: e.id,
    appId: requireConfiguration().appId,
    channel: e.channel,
    uid: e.uid,
    agentUid: e.agentUid,
    avatarUid: e.avatarUid,
    token: tokenFor(e),
    avatarEnabled: e.avatarEnabled,
    expiresAt: e.expiresAt,
  };
}
export async function startAgent(e: SessionEntry) {
  if (e.closed) return;
  if (e.starting) return e.starting;
  if (e.agent) return;
  e.starting = (async () => {
    const c = requireConfiguration();
    const client = new AgoraClient({
      area: Area.US,
      appId: c.appId,
      appCertificate: c.appCertificate,
    });
    let agent = new Agent({
      client,
      turnDetection: { language: "en-US" },
      interruption: { enable: true, mode: "start_of_speech" },
      advancedFeatures: { enable_rtm: false },
      parameters: { data_channel: "datastream", opt_out: true },
    })
      .withStt(new AresSTT())
      .withLlm(
        new OpenAI({
          // Supported Agora-managed preset; no local LLM key or model setting.
          model: "gpt-4o-mini",
          systemMessages: systemMessages(
            products.find((p) => p.id === e.productId) ?? null,
          ),
          // The first product introduction supplies the greeting after playback is ready.
          greetingMessage: "",
          maxHistory: 20,
          maxTokens: 180,
        }),
      )
      .withTts(
        new MurfTTS({
          key: c.ttsKey,
          voiceId: c.voiceId,
          model: "FALCON",
          baseUrl: "wss://global.api.murf.ai/v1/speech/stream-input",
          sampleRate: 24000,
        }),
      );
    if (e.avatarEnabled)
      agent = agent.withAvatar(
        new AnamAvatar({
          apiKey: process.env.ANAM_API_KEY!,
          avatarId: process.env.ANAM_AVATAR_ID!,
          additionalParams: {
            agora_uid: String(e.avatarUid),
            agora_token: tokenFor(e, e.avatarUid),
            sample_rate: 24000,
            quality: "medium",
            video_encoding: "H264",
          },
        }),
      );
    const session = agent.createSession({
      name: `maya_${e.id}`,
      channel: e.channel,
      agentUid: String(e.agentUid),
      remoteUids: [String(e.uid)],
      idleTimeout: 30,
      expiresIn: 1800,
      debug: false,
    });
    await session.start();
    e.agent = session;
    if (e.closed) {
      await session.stop();
      e.agent = undefined;
    }
  })().finally(() => {
    e.starting = undefined;
  });
  return e.starting;
}
export async function stopSession(e: SessionEntry) {
  e.closed = true;
  try {
    await e.starting;
    await e.queue.catch(() => {});
    await e.agent?.stop();
  } finally {
    sessions.delete(e.id);
  }
}
export async function updateProduct(
  e: SessionEntry,
  productId: string | null,
  version: number,
) {
  if (version <= e.version) return { applied: false, version: e.version };
  const product =
    productId === null ? null : products.find((p) => p.id === productId);
  if (product === undefined) throw new Error("INVALID_PRODUCT");
  e.version = version;
  e.productId = productId;
  const operation = e.queue
    .catch(() => {})
    .then(async () => {
      if (e.closed || version !== e.version)
        return { applied: false, version: e.version };
      if (!e.agent) throw new Error("NOT_READY");
      await e.agent.interrupt();
      if (version !== e.version || e.closed)
        return { applied: false, version: e.version };
      await e.agent.update({
        llm: { system_messages: systemMessages(product) },
      });
      if (version !== e.version || e.closed)
        return { applied: false, version: e.version };
      return {
        applied: version === e.version && !e.closed,
        version: e.version,
      };
    });
  e.queue = operation;
  return operation;
}
// Called only after the browser has acknowledged context and resumed playback.
export async function welcomeShowroom(e: SessionEntry) {
  const operation = e.queue.catch(() => {}).then(async () => {
    if (e.closed || e.greeted || e.productId) return { applied: false };
    if (!e.agent) throw new Error("NOT_READY");
    await e.agent.say("Hi! I’m Maya. Welcome to the showroom. Look around, and select anything that catches your eye. I’ll help you explore it.", {
      priority: "INTERRUPT", interruptable: true,
    });
    e.greeted = true;
    return { applied: !e.closed };
  });
  e.queue = operation;
  return operation;
}

export async function introduceProduct(e: SessionEntry, version: number) {
  const operation = e.queue.catch(() => {}).then(async () => {
    if (e.closed || version !== e.version || e.introducedVersion === version)
      return { applied: false };
    const product = products.find(p => p.id === e.productId);
    if (!product) return { applied: false };
    if (!e.agent) throw new Error("NOT_READY");
    await e.agent.say(productIntroduction(product, !e.greeted), {
      priority: "INTERRUPT", interruptable: true,
    });
    e.greeted = true;
    e.introducedVersion = version;
    return { applied: !e.closed && version === e.version };
  });
  e.queue = operation;
  return operation;
}
export async function askAgent(
  e: SessionEntry,
  question: string,
  version: number,
) {
  const operation = e.queue
    .catch(() => {})
    .then(async () => {
      if (e.closed || version !== e.version || !e.agent)
        throw new Error("STALE_SELECTION");
      await e.agent.think(question, {
        on_listening_action: "interrupt",
        on_thinking_action: "interrupt",
        on_speaking_action: "interrupt",
        interruptable: true,
      });
    });
  e.queue = operation;
  await operation;
}

// Additive application feedback uses the same agent and serialized speech queue.
export async function shoppingFeedback(e: SessionEntry, text: string, version: number) {
  const operation = e.queue.catch(() => {}).then(async () => {
    if (e.closed || version !== e.version || !e.agent) throw new Error("STALE_SELECTION");
    await e.agent.say(text, { priority: "INTERRUPT", interruptable: true });
  });
  e.queue = operation;
  await operation;
}
