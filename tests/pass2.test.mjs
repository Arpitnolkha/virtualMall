import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import ts from "typescript";
const nativeRequire = createRequire(import.meta.url);
const root = process.cwd();
function loader(overrides = {}, env = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) {
      file += fs.existsSync(file + ".ts") ? ".ts" : ".tsx";
    }
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const require = (name) => {
      if (name in overrides) return overrides[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/")) return load(name.slice(2));
      if (name.startsWith("."))
        return load(path.resolve(path.dirname(file), name));
      return nativeRequire(name);
    };
    vm.runInNewContext(code, {
      exports,
      require,
      process: { env },
      console,
      Buffer,
      TextDecoder,
      TextEncoder,
      performance,
      crypto: webcrypto,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch,
      Response,
      Request,
      URL,
      atob,
      ...globals,
    });
    return exports;
  }
  return load;
}
const load = loader();
const { parseTranscript, upsertTranscript } = load(
  "lib/agora/transcriptStream.ts",
);
const { RtcTranscriptDecoder } = load("lib/agora/transcriptDecoder.ts");
const base = {
  version: 1,
  type: "transcript",
  speaker: "user",
  text: "Is this",
  final: false,
  messageId: "m1",
  timestamp: 10,
  conversationId: "s1",
};
test("transcript schema rejects malformed JSON, invalid fields and unknown versions", () => {
  assert.equal(parseTranscript("{"), null);
  for (const patch of [
    { version: 2 },
    { type: "audio" },
    { speaker: "robot" },
    { text: 42 },
    { final: "yes" },
    { messageId: "" },
    { timestamp: -1 },
  ])
    assert.equal(parseTranscript(JSON.stringify({ ...base, ...patch })), null);
});
test("partials replace, final commits, duplicate final and late partial do not append", () => {
  let items = [];
  items = upsertTranscript(items, base, "s1");
  items = upsertTranscript(
    items,
    { ...base, text: "Is this waterproof?", final: true },
    "s1",
  );
  const final = items;
  assert.equal(items.length, 1);
  assert.equal(items[0].text, "Is this waterproof?");
  assert.equal(
    upsertTranscript(items, { ...base, text: "wrong" }, "s1"),
    final,
  );
  assert.equal(upsertTranscript(items, { ...base, final: true }, "s1"), final);
  assert.equal(
    upsertTranscript(
      items,
      { ...base, messageId: "other", conversationId: "old" },
      "s1",
    ),
    final,
  );
});
test("wire user and agent messages share stable IDs across partial/final updates", () => {
  const d = new RtcTranscriptDecoder("s1");
  const raw = {
    object: "user.transcription",
    user_id: "1001",
    turn_id: 1,
    stream_id: 0,
    text: "Is this",
    final: false,
  };
  const packet = (m) => new TextEncoder().encode(JSON.stringify(m));
  const partial = d.decode(packet(raw));
  const final = d.decode(
    packet({ ...raw, final: true, text: "Is this waterproof?" }),
  );
  assert.equal(partial.messageId, final.messageId);
  assert.equal(final.final, true);
  assert.equal(d.decode(packet(raw)), null);
  const agent = d.decode(
    packet({
      ...raw,
      object: "assistant.transcription",
      user_id: "2001",
      turn_status: 1,
    }),
  );
  assert.equal(agent.speaker, "agent");
  assert.notEqual(agent.messageId, partial.messageId);
});
test("official chunk framing reassembles out-of-order packets and rejects malformed packets", () => {
  const d = new RtcTranscriptDecoder("s1");
  const json = JSON.stringify({ ...base, messageId: "chunks" });
  const b64 = Buffer.from(json).toString("base64");
  const split = Math.floor(b64.length / 2);
  const enc = new TextEncoder();
  assert.equal(d.decode(enc.encode(`x|2|2|${b64.slice(split)}`)), null);
  assert.equal(
    d.decode(enc.encode(`x|1|2|${b64.slice(0, split)}`)).text,
    "Is this",
  );
  assert.equal(d.decode(enc.encode("x|-2|10000|BAD")), null);
});
test("product payload excludes mesh positions, model URLs, color and mock answers", () => {
  const { productPayload } = load("lib/mall/productPayload.ts");
  const { products } = load("lib/mall/products.ts");
  const p = productPayload(products[0]);
  assert.deepEqual(Object.keys(p), [
    "id",
    "name",
    "category",
    "description",
    "features",
    "suitableFor",
    "suggestedQuestions",
    "details",
  ]);
});
test("latency leaves unavailable provider timings blank", () => {
  const { duration } = load("lib/latency/metrics.ts");
  assert.equal(duration({}, "llmStartedAt", "firstLlmTokenAt"), null);
  assert.equal(
    duration(
      { rtcJoinStartedAt: 10, rtcJoinedAt: 50 },
      "rtcJoinStartedAt",
      "rtcJoinedAt",
    ),
    40,
  );
});
function rtcFixture() {
  const calls = [];
  const handlers = {};
  const mic = {
    stop: () => calls.push("mic-stop"),
    close: () => calls.push("mic-close"),
    getVolumeLevel: () => 0,
    setEnabled: async (v) => calls.push(`mic-${v}`),
  };
  const client = {
    on: (e, h) => {
      assert.equal(handlers[e], undefined);
      handlers[e] = h;
    },
    join: async (...args) => calls.push(["join", ...args]),
    publish: async (tracks) => calls.push(["publish", tracks]),
    subscribe: async () => {},
    leave: async () => calls.push("leave"),
    renewToken: async (t) => calls.push(["renew", t]),
    removeAllListeners: () => {
      calls.push("remove-listeners");
      Object.keys(handlers).forEach((k) => delete handlers[k]);
    },
  };
  const sdk = {
    setLogLevel: () => {},
    disableLogUpload: () => {},
    createClient: () => client,
    createMicrophoneAudioTrack: async () => mic,
  };
  const { RtcSession } = loader({
    "agora-rtc-sdk-ng": { default: sdk, __esModule: true },
  })("lib/agora/rtcSession.ts");
  const sink = {
    transcript: () => {},
    video: () => {},
    connection: () => {},
    activity: () => {},
    audio: () => {},
    error: () => {},
    autoplay: () => {},
  };
  const session = new RtcSession(
    {
      id: "s1",
      appId: "public-app-id",
      channel: "channel",
      uid: 1001,
      agentUid: 2001,
      avatarUid: 3001,
      token: "scoped-token",
    },
    sink,
    async () => "renewed-token",
  );
  return { session, handlers, calls, client, sdk, sink };
}
test("RTC joins correct identity, publishes only microphone, renews once, cleans up in order", async () => {
  const f = rtcFixture();
  await f.session.join();
  assert.deepEqual(f.calls[0], [
    "join",
    "public-app-id",
    "channel",
    "scoped-token",
    1001,
  ]);
  assert.equal(f.calls[1][0], "publish");
  const handler = f.handlers["stream-message"];
  f.handlers["connection-state-change"]("RECONNECTING");
  f.handlers["connection-state-change"]("CONNECTED");
  assert.equal(f.handlers["stream-message"], handler);
  f.handlers["token-privilege-will-expire"]();
  f.handlers["token-privilege-will-expire"]();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(
    f.calls.filter((c) => Array.isArray(c) && c[0] === "renew").length,
    1,
  );
  await f.session.dispose();
  assert.ok(f.calls.indexOf("mic-close") < f.calls.indexOf("leave"));
  assert.equal(Object.keys(f.handlers).length, 0);
});
test("audio ownership switches by stopping old playback before playing avatar audio", async () => {
  const f = rtcFixture();
  await f.session.join();
  function track(name) {
    return {
      setAudioFrameCallback: () => {},
      play: () => f.calls.push(`${name}-play`),
      stop: () => f.calls.push(`${name}-stop`),
      isPlaying: true,
    };
  }
  await f.handlers["user-published"](
    { uid: 2001, audioTrack: track("agent") },
    "audio",
  );
  await f.handlers["user-published"](
    { uid: 3001, audioTrack: track("avatar") },
    "audio",
  );
  assert.ok(
    f.calls.lastIndexOf("agent-stop") < f.calls.lastIndexOf("avatar-play"),
  );
  f.session.suppress(true);
  assert.equal(f.calls.at(-1), "avatar-stop");
  await f.session.dispose();
});
test("mic denial does not join or publish, and cleanup still works", async () => {
  const f = rtcFixture();
  f.sdk.createMicrophoneAudioTrack = async () => {
    throw new Error("PERMISSION_DENIED");
  };
  await assert.rejects(f.session.join(), /PERMISSION_DENIED/);
  assert.equal(f.calls.length, 0);
  await f.session.dispose();
});
test("RTC transcript listener ignores strangers and is removed on teardown", async () => {
  const f = rtcFixture();
  let count = 0;
  f.sink.transcript = () => count++;
  await f.session.join();
  const bytes = new TextEncoder().encode(JSON.stringify(base));
  f.handlers["stream-message"](9999, bytes);
  assert.equal(count, 0);
  f.handlers["stream-message"](2001, bytes);
  assert.equal(count, 1);
  await f.session.dispose();
});
function serverFixture() {
  const calls = [];
  const remote = {
    start: async () => {
      calls.push("start");
      return "agent-id";
    },
    stop: async () => calls.push("stop"),
    interrupt: async () => calls.push("interrupt"),
    update: async (p) => calls.push(["update", p]),
    think: async (t, p) => calls.push(["think", t, p]),
    say: async (t, p) => calls.push(["say", t, p]),
  };
  class Vendor {
    constructor(config) {
      this.config = config;
    }
  }
  class Agent {
    constructor(options) {
      calls.push(["config", options]);
    }
    withStt(v) {
      calls.push(["stt", v.config]);
      return this;
    }
    withLlm(v) {
      calls.push(["llm", v.config]);
      return this;
    }
    withTts(v) {
      calls.push(["tts", v.config]);
      return this;
    }
    withAvatar(v) {
      calls.push(["avatar", v.config]);
      return this;
    }
    createSession(options) {
      calls.push(["session", options]);
      return remote;
    }
  }
  const env = {
    AGORA_APP_ID: "a".repeat(32),
    AGORA_APP_CERTIFICATE: "b".repeat(32),
    MURF_API_KEY: "test-only",
    MURF_VOICE_ID: "voice",
    ANAM_API_KEY: "test-only",
    ANAM_AVATAR_ID: "avatar",
  };
  const registry = loader(
    {
      "agora-agents": {
        Agent,
        AgoraClient: Vendor,
        Area: { US: "us" },
        AresSTT: Vendor,
        OpenAI: Vendor,
        MurfTTS: Vendor,
        AnamAvatar: Vendor,
        generateRtcToken: (opts) => `token-for-${opts.uid}`,
      },
    },
    env,
  )("lib/server/sessionRegistry.ts");
  return { module: registry, calls, remote };
}
test("agent uses RTC transcript transport, opt-out retention, server-issued avatar token and one session", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await Promise.all([f.module.startAgent(e), f.module.startAgent(e)]);
  assert.equal(f.calls.filter((c) => c === "start").length, 1);
  const config = f.calls.find((c) => c[0] === "config")[1];
  assert.equal(config.parameters.data_channel, "datastream");
  assert.equal(config.parameters.opt_out, true);
  assert.equal(config.advancedFeatures.enable_rtm, false);
  assert.equal(
    f.calls.find((c) => c[0] === "avatar")[1].additionalParams.agora_token,
    "token-for-3001",
  );
  const options = f.calls.find((c) => c[0] === "session")[1];
  assert.equal(options.agentUid, "2001");
  assert.deepEqual(Array.from(options.remoteUids), ["1001"]);
  await f.module.stopSession(e);
});
test("rapid server product updates keep only latest context and introduction without new agent", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  const a = f.module.updateProduct(e, "school-backpack", 1);
  const b = f.module.updateProduct(e, "running-shoes", 2);
  const c = f.module.updateProduct(e, "water-bottle", 3);
  await Promise.all([a, b, c]);
  assert.equal(e.productId, "water-bottle");
  const updates = f.calls.filter((c) => c[0] === "update");
  assert.equal(updates.length, 1);
  assert.match(JSON.stringify(updates[0]), /water-bottle/);
  await Promise.all([f.module.introduceProduct(e,1),f.module.introduceProduct(e,2),f.module.introduceProduct(e,3),f.module.introduceProduct(e,3)]);
  assert.equal(f.calls.filter((c) => c[0] === "think").length, 0);
  assert.equal(f.calls.filter((c) => c[0] === "say").length, 1);
  assert.equal(f.calls.filter((c) => c === "start").length, 1);
  await f.module.stopSession(e);
});
test("Backpack to Running Shoes replaces product facts on the same agent", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  const agent = e.agent;
  await f.module.updateProduct(e, "school-backpack", 1);
  await f.module.updateProduct(e, "running-shoes", 2);
  const updates = f.calls.filter((call) => call[0] === "update");
  const contexts = updates.map((call) => {
    const messages = call[1].llm.system_messages;
    assert.equal(messages.length, 3);
    return JSON.parse(messages[1].content.replace("CURRENT_SELECTED_PRODUCT: ", ""));
  });
  assert.equal(contexts[0].id, "school-backpack");
  assert.equal(contexts[1].id, "running-shoes");
  assert.ok(contexts[1].features.includes("Cushioned soles"));
  assert.ok(!JSON.stringify(contexts[1]).includes("Padded shoulder straps"));
  assert.equal(e.agent, agent);
  assert.equal(f.calls.filter((call) => call === "start").length, 1);
  assert.equal(f.calls.filter((call) => call === "stop").length, 0);
  await f.module.stopSession(e);
});
test("current product context does not fabricate missing price or compartment count", () => {
  const { products } = load("lib/mall/products.ts");
  const { systemMessages } = load("lib/mall/productPayload.ts");
  const context = JSON.parse(systemMessages({ ...products[0], details: undefined })[1].content.replace("CURRENT_SELECTED_PRODUCT: ", ""));
  assert.equal(Object.hasOwn(context, "details"), false);
  assert.equal(Object.hasOwn(context, "price"), false);
  assert.equal(Object.hasOwn(context, "compartmentCount"), false);
  assert.ok(context.features.includes("Multiple compartments"));
  assert.equal(systemMessages(null)[1].content, "CURRENT_SELECTED_PRODUCT: null");
});
test("all catalog products supply their own demo details to the existing agent context", () => {
  const { products } = load("lib/mall/products.ts");
  const { systemMessages } = load("lib/mall/productPayload.ts");
  assert.equal(products.length, 30);
  for (const product of products) {
    const messages = systemMessages(product);
    assert.equal(messages.length, 3);
    const context = JSON.parse(messages[1].content.replace("CURRENT_SELECTED_PRODUCT: ", ""));
    assert.equal(context.id, product.id);
    assert.deepEqual(context.details, JSON.parse(JSON.stringify(product.details)));
    assert.equal(context.details.catalogStatus, "demo");
    assert.ok(Number.isFinite(context.details.price.amount) && context.details.price.amount > 0);
    assert.equal(context.details.price.currency, "INR");
    for (const field of ["materials", "durability", "comfort", "care"]) assert.ok(context.details[field].length > 0);
    assert.ok(Object.keys(context.details.specifications).length > 0);
    assert.equal(Object.hasOwn(context, "answers"), false);
  }
});
test("API validates origin and returns safe errors without provider details", () => {
  const { sameOrigin, failure } = load("lib/server/http.ts");
  assert.throws(
    () =>
      sameOrigin(
        new Request("http://localhost:3015/api/mall/sessions", {
          headers: { origin: "http://other.example" },
        }),
      ),
    /FORBIDDEN/,
  );
  const response = failure(new Error("SECRET PROVIDER TRACE"));
  assert.equal(response.status, 502);
});
test("in-flight context change never introduces the superseded product", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  let release;
  let began;
  const started = new Promise((r) => {
    began = r;
  });
  const original = f.remote.update;
  f.remote.update = async (p) => {
    await original(p);
    if (JSON.parse(p.llm.system_messages[1].content.replace("CURRENT_SELECTED_PRODUCT: ", "")).id === "school-backpack") {
      began();
      await new Promise((r) => {
        release = r;
      });
    }
  };
  const first = f.module.updateProduct(e, "school-backpack", 1);
  await started;
  const latest = f.module.updateProduct(e, "water-bottle", 2);
  release();
  await Promise.all([first, latest]);
  await f.module.introduceProduct(e,1);
  await f.module.introduceProduct(e,2);
  const intros = f.calls.filter((c) => c[0] === "say");
  assert.equal(intros.length, 1);
  assert.match(intros[0][1], /Water Bottle/);
  await f.module.stopSession(e);
});
test("stopping during agent startup closes the late session exactly once", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  let release;
  f.remote.start = () =>
    new Promise((r) => {
      release = r;
    });
  const start = f.module.startAgent(e);
  const stop = f.module.stopSession(e);
  release();
  await Promise.all([start, stop]);
  assert.equal(e.closed, true);
  assert.equal(e.agent, undefined);
  assert.equal(f.calls.filter((c) => c === "stop").length, 1);
});

test('same-origin validation respects the incoming Host when Next normalizes its URL',()=>{const {sameOrigin}=load('lib/server/http.ts');assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3015/api/mall/sessions',{headers:{origin:'http://127.0.0.1:3015',host:'127.0.0.1:3015'}})));assert.throws(()=>sameOrigin(new Request('http://localhost:3015/api/mall/sessions',{headers:{origin:'http://evil.example',host:'127.0.0.1:3015'}})),/FORBIDDEN/);});

test("managed LLM and ARES need no vendor keys; Murf uses configured voice", async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  const llm = f.calls.find(c => c[0] === "llm")[1];
  assert.equal(llm.apiKey, undefined);
  assert.equal(llm.url, undefined);
  assert.equal(llm.model, "gpt-4o-mini");
  const tts = f.calls.find(c => c[0] === "tts")[1];
  assert.equal(tts.key, "test-only");
  assert.equal(tts.voiceId, "voice");
  assert.equal(tts.model, "FALCON");
  assert.equal(tts.sampleRate, 24000);
  assert.equal(f.calls.find(c => c[0] === "stt")[1], undefined);
  await f.module.stopSession(e);
});
test("installed SDK resolves the keyless LLM into the Agora-managed preset", () => {
 const {OpenAI,MurfTTS}=nativeRequire('agora-agents');
 const {resolveSessionPresets}=nativeRequire(path.join(root,'node_modules/agora-agents/dist/cjs/agentkit/presets.js'));
 const llm=new OpenAI({model:'gpt-4o-mini'}).toConfig();
 const resolved=resolveSessionPresets({properties:{llm}});
 assert.match(resolved.preset,/openai_gpt_4o_mini/);
 assert.equal(resolved.properties.llm.api_key,undefined);
 const tts=new MurfTTS({key:'test-only',voiceId:'voice',model:'FALCON',sampleRate:24000}).toConfig();
 assert.equal(tts.vendor,'murf');assert.equal(tts.params.voiceId,'voice');
});

test("Murf configuration rejects JSON voice settings before starting an agent", () => {
  const env = {AGORA_APP_ID:"app",AGORA_APP_CERTIFICATE:"cert",MURF_API_KEY:"test-only",MURF_VOICE_ID:'{"voice_id":"Anisha","model":"Falcon"}'};
  const invalid = loader({},env)("lib/server/config.ts");
  assert.throws(()=>invalid.requireConfiguration(),/INVALID_TTS_VOICE_CONFIGURATION/);
  const valid = loader({},{...env,MURF_VOICE_ID:" Anisha "})("lib/server/config.ts");
  assert.equal(valid.requireConfiguration().voiceId,"Anisha");
});

test("product introductions contain only shopper-facing catalog copy and fit the speak limit", () => {
 const {productIntroduction}=load('lib/mall/productPayload.ts');
 const {products}=load('lib/mall/products.ts');
 for (const p of products) {const text=productIntroduction(p);assert.ok(Buffer.byteLength(text)<=512);assert.ok(text.includes(p.name));assert.ok(text.includes(p.description));assert.doesNotMatch(text,/CURRENT_SELECTED_PRODUCT|The shopper selected|Do not greet/);}
});
test("playback resumes before requesting the spoken product introduction", async () => {
 class Avatar {stopSpeaking(){} }
 const {AgoraConversationController}=loader({'@/lib/avatar/anamShopkeeper':{AnamShopkeeperController:Avatar}})('lib/agora/conversation.ts');
 const calls=[];
 const c=new AgoraConversationController({status:()=>{},avatar:()=>{},video:()=>{},timing:()=>{}},false);
 c.version=1;c.contextBusy=true;c.rtc={suppress:value=>calls.push(['suppress',value])};
 c.api=async data=>{calls.push(['api',data.action]);return {applied:true};};
 await c.updateContext(load('lib/mall/products.ts').products[0],1);
 assert.deepEqual(calls,[['api','context'],['suppress',false],['api','introduce']]);
 assert.equal(c.contextBusy,false);
});

test("first product greets as Maya; later products reuse the session without a second greeting", async () => {
 const f=serverFixture();const e=f.module.createSession(webcrypto.randomUUID());await f.module.startAgent(e);
 assert.equal(f.calls.find(c=>c[0]==='llm')[1].greetingMessage,'');
 await f.module.updateProduct(e,'school-backpack',1);await f.module.introduceProduct(e,1);
 await f.module.updateProduct(e,'running-shoes',2);await f.module.introduceProduct(e,2);
 const spoken=f.calls.filter(c=>c[0]==='say');assert.match(spoken[0][1],/I’m Maya/);assert.match(spoken[0][1],/School Backpack/);assert.doesNotMatch(spoken[1][1],/I’m Maya/);assert.match(spoken[1][1],/Running Shoes/);assert.equal(f.calls.filter(c=>c==='start').length,1);await f.module.stopSession(e);
});

function videoFixture() {
 let id=0;const frames=new Map();
 const video={style:{},readyState:0,videoWidth:0,videoHeight:0,removed:false,
 setAttribute:()=>{},addEventListener:()=>{},removeEventListener:()=>{},
 play:async()=>{},pause:()=>{},remove(){this.removed=true;},
 requestVideoFrameCallback:cb=>{frames.set(++id,cb);return id;},cancelVideoFrameCallback:n=>frames.delete(n)};
 return {video,frames,emit(){const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb());}};
}
test("avatar stays on fallback until a decoded frame exists, then cleans up muted video",async()=>{
 const f=videoFixture();const shown=[];let appended=false;
 const {AnamShopkeeperController}=loader({}, {},{document:{createElement:()=>f.video,body:{appendChild:()=>{appended=true;}}},MediaStream:class {}})('lib/avatar/anamShopkeeper.ts');
 const c=new AnamShopkeeperController(()=>{},v=>shown.push(v));await c.initialize();const attaching=c.attach({});
 await Promise.resolve();assert.equal(appended,true);assert.equal(shown.filter(Boolean).length,0);
 f.video.readyState=2;f.video.videoWidth=720;f.video.videoHeight=1280;f.emit();await attaching;
 assert.equal(shown.at(-1),f.video);assert.equal(f.video.muted,true);
 c.dispose();assert.equal(f.video.removed,true);assert.equal(f.video.srcObject,null);assert.equal(f.frames.size,0);
});
test("disposing an avatar while waiting for its first frame cannot present stale video",async()=>{
 const f=videoFixture();const shown=[];
 const {AnamShopkeeperController}=loader({}, {},{document:{createElement:()=>f.video,body:{appendChild:()=>{}}},MediaStream:class {}})('lib/avatar/anamShopkeeper.ts');
 const c=new AnamShopkeeperController(()=>{},v=>shown.push(v));const attaching=c.attach({});c.dispose();await attaching;assert.equal(shown.filter(Boolean).length,0);assert.equal(f.frames.size,0);
});
test("video texture remount gets a fresh texture and continues uploading frames",()=>{
 const f=videoFixture();f.video.readyState=2;
 const {MeshBasicMaterial}=nativeRequire('three');const material=new MeshBasicMaterial();let renders=0;
 const {bindVideoSurface}=load('lib/avatar/videoSurface.ts');
 const stop=bindVideoSurface(f.video,material,()=>renders++);const first=material.map;stop();assert.equal(f.frames.size,0);
 const stopAgain=bindVideoSurface(f.video,material,()=>renders++);assert.notEqual(material.map,first);
 const before=material.map.version;f.emit();assert.ok(material.map.version>before);assert.ok(renders>2);
 stopAgain();assert.equal(f.frames.size,0);assert.equal(material.map,null);material.dispose();
});

test("person compositor closes a late captured frame after unmount without posting it", async () => {
  const workers = [];
  let resolveFrame;
  class WorkerMock {
    sent = []; terminated = false;
    constructor() { workers.push(this); }
    postMessage(message) { this.sent.push(message); }
    terminate() { this.terminated = true; }
  }
  const load = loader({}, {}, {
    document: { createElement: () => ({ width: 1, height: 1, getContext: () => ({ clearRect() {}, drawImage() {} }) }) },
    Worker: WorkerMock, HTMLVideoElement: class {}, OffscreenCanvas: class {},
    createImageBitmap: () => new Promise(resolve => { resolveFrame = resolve; }),
  });
  const { bindPersonSurface } = load("lib/avatar/personSurface.ts");
  const material = { map: null };
  let failed = false;
  const stop = bindPersonSurface({ naturalWidth: 100, naturalHeight: 100 }, material, () => {}, () => { failed = true; });
  workers[0].onmessage({ data: { type: "ready" } });
  stop();
  let closed = false;
  resolveFrame({ close() { closed = true; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, true);
  assert.equal(workers[0].sent.length, 1);
  assert.equal(workers[0].terminated, true);
  assert.equal(material.map, null);
  assert.equal(failed, false);
});

test("person compositor presents the cutout and releases the still-image worker", () => {
  const workers = [];
  let draws = 0;
  class WorkerMock {
    terminated = false;
    constructor() { workers.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  }
  const load = loader({}, {}, {
    document: { createElement: () => ({ width: 1, height: 1, getContext: () => ({ clearRect() {}, drawImage() { draws++; } }) }) },
    Worker: WorkerMock, HTMLVideoElement: class {}, OffscreenCanvas: class {},
  });
  const { bindPersonSurface } = load("lib/avatar/personSurface.ts");
  const material = { map: null };
  let renders = 0, closed = false;
  const stop = bindPersonSurface({ naturalWidth: 100, naturalHeight: 100 }, material, () => renders++, () => assert.fail("unexpected failure"));
  const worker = workers[0];
  assert.equal(material.opacity, 0);
  worker.onmessage({ data: { type: "frame", frame: { width: 100, height: 100, close() { closed = true; } } } });
  assert.equal(draws, 1);
  assert.equal(material.opacity, 1);
  assert.equal(renders, 1);
  assert.equal(closed, true);
  assert.equal(worker.terminated, true);
  stop();
  assert.equal(material.map, null);
});

test("live compositor keeps the portrait until a cutout is presented and signals readiness only once", () => {
  const workers = [];
  class VideoMock {}
  class WorkerMock {
    constructor() { workers.push(this); }
    postMessage() {}
    terminate() {}
  }
  const load = loader({}, {}, {
    document: { createElement: () => ({ width: 1, height: 1, getContext: () => ({ clearRect() {}, drawImage() {} }) }) },
    Worker: WorkerMock, HTMLVideoElement: VideoMock, OffscreenCanvas: class {},
  });
  const { bindPersonSurface } = load("lib/avatar/personSurface.ts");
  const material = { map: null };
  let ready = 0;
  const stop = bindPersonSurface(new VideoMock(), material, () => {}, () => assert.fail("unexpected failure"), () => {
    assert.equal(material.opacity, 1);
    assert.ok(material.map);
    ready++;
  });
  const worker = workers[0];
  worker.onmessage({ data: { type: "skip" } });
  assert.equal(ready, 0);
  assert.equal(material.opacity, 0);
  assert.equal(material.map, null);
  const present = () => worker.onmessage({ data: { type: "frame", frame: { width: 100, height: 100, close() {} } } });
  present();
  const lastGoodTexture = material.map;
  const lastGoodVersion = material.map.version;
  worker.onmessage({ data: { type: "skip" } });
  assert.equal(material.opacity, 1);
  assert.equal(material.map, lastGoodTexture);
  assert.equal(material.map.version, lastGoodVersion);
  present();
  assert.ok(material.map.version > lastGoodVersion);
  assert.equal(ready, 1);
  stop();
  present();
  assert.equal(ready, 1);
  assert.equal(material.map, null);
});

test("entry welcome is serialized once and shares the greeting flag with all products", async () => {
  const f=serverFixture();
  const e=f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  await Promise.all([f.module.welcomeShowroom(e),f.module.welcomeShowroom(e),f.module.welcomeShowroom(e)]);
  assert.equal(f.calls.filter(c=>c[0]==="say").length,1);
  assert.match(f.calls.find(c=>c[0]==="say")[1],/Welcome to the showroom/);
  const agent=e.agent;
  for(const [version,id] of [[1,"school-backpack"],[2,"running-shoes"],[3,"headphones"]]) {
    await f.module.updateProduct(e,id,version);
    await f.module.introduceProduct(e,version);
    await f.module.welcomeShowroom(e);
    assert.equal(e.agent,agent);
  }
  const spoken=f.calls.filter(c=>c[0]==="say").map(c=>c[1]);
  assert.equal(spoken.length,4);
  for(const line of spoken.slice(1))assert.doesNotMatch(line,/Hi!|Welcome to the showroom/);
  assert.equal(f.calls.filter(c=>c==="start").length,1);
  assert.equal(f.calls.filter(c=>c[0]==="session").length,1);
  await f.module.stopSession(e);
});

test("late welcome cannot interrupt a selected product or a stopped session",async()=>{
  const f=serverFixture();const e=f.module.createSession(webcrypto.randomUUID());
  await f.module.startAgent(e);
  await f.module.updateProduct(e,"school-backpack",1);
  assert.equal((await f.module.welcomeShowroom(e)).applied,false);
  assert.equal(f.calls.filter(c=>c[0]==="say").length,0);
  await f.module.stopSession(e);
  assert.equal((await f.module.welcomeShowroom(e)).applied,false);
});

test("legacy showroom placements and popup prices preserve catalog facts",()=>{
  const {products}=load('lib/mall/products.ts');
  const {showroomProduct,productPrice,displays}=load('lib/mall/showroom.ts');
  const legacyIds = new Set(displays.flatMap(d=>d.products));
  assert.equal(legacyIds.size,8);
  for(const p of products){
    const placed=showroomProduct(p);
    assert.equal(placed.id,p.id);
    assert.equal(placed.details,p.details);
    if (legacyIds.has(p.id)) assert.notDeepEqual(placed.position,p.position);
    assert.equal(productPrice(p),new Intl.NumberFormat('en-IN',{style:'currency',currency:p.details.price.currency,maximumFractionDigits:0}).format(p.details.price.amount));
  }
});

test("360-degree navigation takes the short turn even after multiple rotations",()=>{
  const {nearestYaw,dragLook}=load('lib/mall/navigation.ts');
  for(const current of [-20*Math.PI,-Math.PI+.02,Math.PI-.02,20*Math.PI]){
    for(const target of [-Math.PI+.01,0,Math.PI-.01]){
      const next=nearestYaw(target,current);
      assert.ok(Math.abs(next-current)<=Math.PI+1e-10);
      assert.ok(Math.abs(Math.sin(next)-Math.sin(target))<1e-10);
      assert.ok(Math.abs(Math.cos(next)-Math.cos(target))<1e-10);
    }
  }
  const rotated=dragLook(0,0,3000,0);
  assert.ok(rotated.yaw<-2*Math.PI,'yaw must not clamp when looking behind');
  assert.equal(dragLook(0,0,0,10000).pitch,.55);
  assert.equal(dragLook(0,0,0,-10000).pitch,-.6);
});

test('agent audio completion remains observable while microphone activity masks avatar speaking', () => {
 const states=[]; const updates=[];
 class Avatar { constructor(sink){this.sink=sink;} setState(s){this.sink(s);} }
 const {AgoraConversationController}=loader({'@/lib/avatar/anamShopkeeper':{AnamShopkeeperController:Avatar}})('lib/agora/conversation.ts');
 const controller=new AgoraConversationController({status:s=>updates.push(s),avatar:s=>states.push(s),video:()=>{},timing:()=>{}},false);
 controller.activity(true,true);
 assert.equal(states.at(-1),'listening');
 assert.equal(updates.at(-1).agentSpeaking,true);
 controller.activity(false,true);
 controller.activity(true,false);
 assert.equal(updates.at(-1).agentSpeaking,false);
 controller.activity(false,false);
 assert.equal(states.at(-1),'thinking');
 assert.deepEqual(updates.map(update => update.agentSpeaking),[true,false]);
 controller.activity(false,true);
 assert.equal(updates.at(-1).agentSpeaking,true);
});

function connectionFixture() {
  let releaseJoin, releaseStart, rejectStart;
  const joined = new Promise(r => { releaseJoin = r; });
  const started = new Promise((r, reject) => { releaseStart = r; rejectStart = reject; });
  const calls = [], statuses = [];
  const { AgoraConversationController } = loader({
    './rtcSession': { RtcSession: class {
      async join() { calls.push('join'); await joined; }
      async waitForAgent() { calls.push('present'); }
      async dispose() { calls.push('rtc-dispose'); }
    } },
    '@/lib/avatar/anamShopkeeper': { AnamShopkeeperController: class {
      async initialize() {} setState() {} dispose() {} stopSpeaking() {}
    } },
  }, {}, { fetch: async (_url, init) => {
    const data = JSON.parse(init.body);
    if (!data.action) return Response.json({id:'test-session',expiresAt:Date.now()+60000,avatarEnabled:false});
    calls.push(data.action);
    if (data.action === 'start') await started;
    return Response.json({});
  } })('lib/agora/conversation.ts');
  const controller = new AgoraConversationController({status:s=>statuses.push(s),avatar:()=>{},video:()=>{},transcript:()=>{},clear:()=>calls.push('clear'),timing:()=>{}},false);
  return { controller,calls,statuses,releaseJoin,releaseStart,rejectStart };
}
const flushConnection = () => new Promise(r => setImmediate(r));
test('agent provisioning overlaps RTC join; greeting waits for both', async () => {
  const f = connectionFixture();
  const connecting = f.controller.connect();
  await flushConnection();
  assert.ok(f.calls.includes('join'));
  assert.ok(f.calls.includes('start'), 'start must not wait for slow RTC join');
  f.releaseStart();
  await flushConnection();
  assert.equal(f.calls.includes('welcome'), false);
  assert.equal(f.statuses.some(s=>s.phase==='ready'), false);
  f.releaseJoin();
  await connecting;
  assert.ok(f.calls.indexOf('welcome') > f.calls.indexOf('present'));
  assert.equal(f.statuses.filter(s=>s.phase==='ready').length,1);
  await f.controller.dispose();
});
test('cancel during parallel startup never welcomes or marks ready', async () => {
  const f = connectionFixture();
  const connecting = f.controller.connect();
  await flushConnection();
  await f.controller.dispose();
  f.releaseJoin(); f.releaseStart();
  await connecting;
  assert.equal(f.calls.includes('welcome'),false);
  assert.equal(f.statuses.some(s=>s.phase==='ready'),false);
  assert.ok(f.calls.includes('stop'));
});
test('late start request cannot revive a closed server session', async () => {
  const f = serverFixture();
  const e = f.module.createSession(webcrypto.randomUUID());
  await f.module.stopSession(e);
  await f.module.startAgent(e);
  assert.equal(f.calls.filter(c=>c==='start').length,0);
});

test('agent startup failure cleans up while RTC is still joining', async () => {
  const f = connectionFixture();
  const connecting = f.controller.connect();
  await flushConnection();
  f.rejectStart(new Error('provider unavailable'));
  await connecting;
  await flushConnection();
  assert.ok(f.statuses.some(s=>s.phase==='error'));
  assert.ok(f.calls.includes('rtc-dispose'));
  assert.ok(f.calls.includes('stop'));
  f.releaseJoin();
  await flushConnection();
  assert.equal(f.calls.includes('welcome'),false);
  assert.equal(f.statuses.some(s=>s.phase==='ready'),false);
  await f.controller.dispose();
});


test('start API returns the provider agent ID after creation', async () => {
  const entry = { avatarEnabled: true, agent: undefined };
  const { POST } = loader({
    '@/lib/server/sessionRegistry': {
      getSession: () => entry,
      startAgent: async () => { entry.agent = { id: 'agora-provider-agent-123' }; },
    },
  })('app/api/mall/sessions/[id]/route.ts');
  const response = await POST(new Request('http://localhost:3015/api/mall/sessions/local-id', {
    method: 'POST', headers: { origin: 'http://localhost:3015', authorization: 'Bearer test-key', 'content-type': 'application/json' },
    body: JSON.stringify({action:'start'}),
  }), {params: Promise.resolve({id:'local-id'})});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ready:true,agentId:'agora-provider-agent-123',avatarEnabled:true});
});

test("agent departure requests recovery without treating avatar departure as a lost voice session", async () => {
  const f = rtcFixture();
  const errors = [];
  f.sink.error = message => errors.push(message);
  await f.session.join();
  const left = f.handlers['user-left'];
  left({ uid: 3001 });
  left({ uid: 9999 });
  assert.equal(errors.length, 0);
  left({ uid: 2001 });
  assert.match(errors[0], /Maya disconnected.*reconnect/);
  await f.session.dispose();
  left({ uid: 2001 });
  assert.equal(errors.length, 1);
});
