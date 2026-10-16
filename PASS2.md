# Pass 2 implementation and verification report

Anam.ai is the provider confirmed by the user (the original request called it “Enum”). The real integration code is implemented. Live provider acceptance remains pending until the configured accounts are exercised end to end. Mock-based SDK tests and local browser checks cannot establish that a paid provider account, actual microphone, network recovery or avatar lip-sync works end to end.

## Requested report

1. **Files added/modified.** Added `lib/agora/{rtcSession,conversation,transcriptStream,transcriptDecoder}.ts`, `lib/avatar/anamShopkeeper.ts`, `lib/server/{config,http,sessionRegistry}.ts`, `lib/latency/metrics.ts`, `lib/mall/{productPayload,handoff}.ts`, `components/avatar/AnamAvatarView.tsx`, `components/conversation/{VoiceControl,LatencyPanel}.tsx`, `app/api/mall/config/route.ts`, `app/api/mall/sessions/route.ts`, `app/api/mall/sessions/[id]/route.ts`, blank environment files, `tests/pass2.test.mjs` and this report. Updated product context/events, conversation message types, MallExperience/MallScene, ConversationPanel/TranscriptMock, global styles, dependencies/lockfile, ignore rules and README. Product positions, primitives and catalog selection behavior remain intact.
2. **Anam SDK.** `AnamAvatar` from installed `agora-agents@2.11.0` provisions Anam through Agora’s supported avatar integration. `agora-rtc-sdk-ng@4.24.8` receives its media; `agora-agent-client-toolkit@2.10.0` supplies the official transcript chunk assembler. No guessed “Enum” package and no parallel Anam voice client.
3. **Initialization.** User action reserves a server session and scoped RTC identities. The browser captures/publishes its microphone; the server starts one Agora agent with Anam API key, avatar ID and separate avatar RTC publisher credentials. The app-facing Anam controller presents a muted video-only MediaStream on the existing counter. Actual received video marks avatar readiness; actual RTC participant presence marks agent readiness.
4. **Avatar fallback.** Existing placeholder remains during initialization, missing Anam configuration, video failure or timeout. A keyed render boundary protects the scene. Voice can continue when its audio track remains available. If Anam provisioning prevents agent startup, an explicit audio-only retry creates a clean replacement session; reconnect-with-video also deliberately restarts the failed provider session.
5. **Audio ownership.** Agora RTC is the sole audible playback owner. Prefer the avatar publisher’s synchronized audio; fall back to the agent publisher if no avatar audio is present. Anam generates synchronized media upstream; its HTML video element is muted and contains only a video track.
6. **No duplicate playback.** One selected remote audio track plays. Switching ownership stops the previous track before playing the next. Context changes suppress playback until the latest update is acknowledged. There is no browser TTS or second avatar audio player.
7. **RTC architecture.** A session class owns one client, microphone, subscriptions, events, playback arbitration and cleanup. RTC SDK loading and media capture occur on connection, outside product components. Product selection never joins/publishes again. Mic stop/close precedes leave; pending joins and disposal are guarded.
8. **Token API.** Node route handlers issue channel/UID-scoped, 30-minute RTC tokens server-side using `generateRtcToken`. App certificate, LLM, TTS and Anam secrets never enter the response. Mutations require same-origin requests and a per-session random bearer capability; responses are non-cacheable. Session reservation is idempotent per capability; client renewal is single-flight.
9. **Conversational AI.** The current `AgoraClient`/`Agent`/`AgentSession` SDK uses Agora-managed Ares ASR, Agora-managed OpenAI (no local LLM key/model setting), Murf Falcon TTS and optional Anam. `data_channel: datastream`, RTM disabled, opt-out enabled, start-of-speech interruption enabled. US service region and English ASR are explicit defaults.
10. **Persistent Maya.** A connection owns one channel, one session and one agent. Agent startup is locked against duplicates. Greeting is supplied only when starting a new agent. Reconnect and product changes do not create a new agent. End, leaving the page, expiry or explicit retry tears down the session.
11. **Product context.** Canvas and accessible buttons share the same `activeProduct` path. Server validates the catalog ID and builds only ID/name/category/description/features/suitability/questions into reusable system messages. Meshes, coordinates and UI state are excluded. Update modifies the existing agent’s LLM system messages.
12. **Automatic introduction.** After context update is acknowledged and browser audio resumes, a versioned `introduce` action calls supported `AgentSession.say` with a short factual catalog introduction. No internal prompt is injected as user input. Duplicate selection IDs are ignored; the reusable prompt prohibits invented stock, prices, materials and specifications and tolerates imperfect ASR.
13. **Rapid changes.** A 180ms selection debounce, monotonically increasing version, serialized server mutations, checks after awaited calls and immediate local audio suppression favor the newest product. Superseded updates do not issue introductions; repeated introduction requests for the same version are ignored. Provider interruption is performed within the versioned server operation, avoiding unversioned late interrupts. Media already buffered by a provider cannot be conclusively tested without a live session.
14. **Transcript transport.** Exactly one RTC `stream-message` handler accepts expected sender UIDs. The official bounded chunk assembler handles `message_id|part_idx|part_sum|base64` framing. Validated `user.transcription` and `assistant.transcription` objects normalize to the requested versioned schema. No RTM subscription, application WebSocket or transcript polling was added. Next.js development HMR is unrelated.
15. **User partial/final behavior.** Stable session/speaker/user/stream/turn IDs update one bubble in place; finals replace partials. Duplicate finals and partials after final are ignored. No deduplication by text. Malformed events are discarded without stopping audio.
16. **Agent transcript.** Assistant turn status maps partial/end/interrupted events; sequence numbers reject older updates. Maya cream and user aqua styles remain. Live history is memory-only and bounded to 80 messages, with bounded decoder tombstones. Agent transcript delivery is suppressed while context is being replaced.
17. **Listener lifecycle.** Listeners register once before RTC join and are removed on true teardown. Decoder state is cleared; disposed and conversation-ID checks prevent old sessions mutating new UI. Fast React/transcript updates never register RTC handlers.
18. **Reconnect.** SDK reconnect reuses the client and existing listeners, shows reconnect status and restores ready status on reconnection. Unrecoverable disconnect exposes a clean retry. Automatic network recovery is implemented but not validated against a real provider connection.
19. **Avatar states.** Initialization → loading; waiting → idle; microphone activity → listening; user speech end/final ASR → thinking; audible remote activity → speaking; failures → error. A clearly labeled local preview retains Pass 1 behavior before connecting.
20. **Speaking synchronization.** Live speaking state uses remote audio PCM energy and playback state, with a short silence hysteresis to avoid jitter. Autoplay-blocked or suppressed audio does not indicate speaking. Anam supplies its actual lip-synced video; the browser does not fabricate visemes or use fixed response-duration timers. Video frame callbacks update the demand-rendered canvas.
21. **Interruption.** Agora’s supported start-of-speech interruption remains enabled. Local user activity switches the avatar state to listening; provider interruption handles the actual response. Product-context changes call the supported interrupt method. Real spoken barge-in must still be verified with credentials.
22. **Latency.** Query-only diagnostics expose avatar/RTC/agent startup, product-context latency, local speech boundaries, ASR partial/final and first received/played audio. All requested timing fields exist. LLM start/first token and TTS start are not observable reliably in this RTC-only configuration, so TTFT/TTFB remain unavailable rather than invented. Local energy-based speech boundaries are estimates; no transcript text goes into metrics.
23. **Handoff.** `HUMAN_HANDOFF_REQUESTED`, none/requested/waiting/connected state and a retained minimal selected-product summary are available through context. A future authorized `HUMAN_HANDOFF_CONNECTED` event can stop the AI and authorize human RTC media on the same client. No contact-center UI/backend, routing or transcript export was built.
24. **Security/environment.** `.env.local` and `.env.example` use Agora, Murf and optional Anam configuration. Existing user-supplied Agora/Murf values are preserved; LLM key/model variables are removed. No secret uses `NEXT_PUBLIC_*`. Server-only modules enforce the boundary. No raw audio recording, database transcript storage or speech analytics were added. Provider processing is required for live conversation; provider/account retention policies are separate from local storage. A process-local bounded session registry and capability auth are suitable for this local demo, not a substitute for production app auth and distributed coordination.
25. **Desktop.** Chromium 1440×900 and 1366×768: no horizontal overflow. All eight actual 3D meshes selected correctly; keyboard Enter selected Water Bottle through the common flow. Camera drag/reset remain usable.
26. **Tablet.** Chromium viewport emulation at 1024×768 and 820×1180: no horizontal overflow; original responsive scene/panel structure preserved.
27. **Mobile.** Chromium viewport emulation at 430×932, 390×844 and landscape 844×390: no horizontal overflow. Product details, voice controls and configuration error are reachable by scrolling. No physical device/microphone test is claimed.
28. **TypeScript.** `npm run typecheck` passes.
29. **Lint.** `npm run lint` passes.
30. **Tests/build.** `npm test` passes all 30 tests: the original five plus SDK-boundary, protocol, audio-ownership, mic-denial, cleanup, security and product-race tests. `npm run build` produces the app and dynamic Node API routes. These use mocked provider boundaries, not external credentials.
31. **Known limitations.** Live ASR/LLM/TTS/Anam, real mic denial UI, real barge-in, provider network reconnect and media synchronization require account credentials and remain unverified. The session registry is single-process, sessions expire after 30 minutes, retries restart the conversation, and Anam availability depends on account provisioning. Provider TTFT/TTFB are unavailable in the selected transport. Local preview replies are expressly labeled and are not evidence of live AI. In-flight media has no product-version tag, so absolute exclusion of delayed provider frames cannot be guaranteed solely by local sequencing; live rapid-switch testing is required.

## Credentialed acceptance checklist

After filling `.env.local` and restarting the server:

- Connect with microphone consent; confirm one spoken greeting and received Anam video.
- Select Backpack; ask “Is this waterproof?” Confirm user partial/final, factual agent answer, one audio stream and synchronized video.
- Select Shoes and ask “Are these good for running?” Confirm unchanged channel/agent identity and current context.
- Rapidly select Backpack → Shoes → Bottle, including during speech. Verify no old introduction remains audible after the new context is applied.
- Interrupt Maya by speaking; test mute/unmute and autoplay recovery.
- Disconnect/reconnect the network; confirm recovery without duplicate transcripts/audio.
- Test invalid Anam credentials, audio-only retry, denied microphone and explicit End during connection.
- Check browser media capture stops after End or navigation; check provider sessions stop/idle out.
- Inspect debug timings; unavailable values should remain unavailable rather than showing artificial numbers.

## Sources and package matching

Provider calls were checked against installed SDK types and implementation, plus official documentation:

- [Agora Anam integration](https://docs.agora.io/en/ai/models/avatar/anam)
- [Agora transcript transport](https://docs.agora.io/en/ai/build/transcripts)
- [Agora Conversational AI API specification](https://docs-md.agora.io/api/conversational-ai-api-v2.x.yaml)
- [Agora documentation index](https://docs.agora.io/llms/ai.txt)

Installed `AnamAvatar` types use `avatarId`; the server adds documented REST parameters for the separate avatar UID/token through `additionalParams`. This deliberately follows the installed 2.11.0 SDK and the REST schema where examples differ. The transcript adapter follows the installed 2.10.0 chunk assembler and wire object format. Provider upgrades should rerun protocol tests and credentialed acceptance.

Murf configuration follows the [official Agora Murf reference](https://docs.agora.io/en/ai/models/tts/murf): `MurfTTS`, Falcon streaming endpoint, supplied voice ID and 24 kHz audio.

## Audio configuration diagnosis

The configured Murf voice value was a JSON settings object. A direct request to Murf returned `INVALID_VOICE` because that entire object was treated as the voice identifier. The local setting was corrected to the plain voice ID `Anisha`, and server validation now rejects object/array-shaped voice values before agent creation. A subsequent direct Murf streaming test returned 27,308 bytes of PCM audio without a voice error. This verifies provider synthesis; it does not establish audible output from the user’s browser or speakers. Existing agent sessions must reconnect to receive the corrected TTS configuration.

## Product-first startup

Selecting either a 3D product or its accessible button now starts the live session automatically. The idle UI has no Talk to Maya prerequisite. The first product introduction includes Maya’s self-introduction; subsequent selections describe the new product using the same session. The agent startup greeting is empty to prevent overlapping greetings before product context/audio are ready. Microphone permission and browser autoplay restrictions still apply.

## Avatar video rendering repair

The video texture now belongs to a single effect lifetime rather than a memoized object reused after cleanup. Each decoded frame updates the texture and invalidates the demand-rendered canvas. The presenter waits for the first decoded frame before replacing the placeholder and keeps its muted video element attached for browser decoding compatibility. Tests cover remount frame updates, first-frame readiness and disposal during startup. A live browser check received 1152×768 Anam video with readyState 4 and visually confirmed the avatar rendering at the counter, replacing the black rectangle.
