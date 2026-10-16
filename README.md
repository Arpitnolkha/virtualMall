# Maya’s — Interactive 3D Mall

A panoramic Next.js, React and TypeScript showroom with product galleries, Agora RTC voice, Agora Conversational AI, Murf speech, and an Anam avatar. Customers can browse products, build a demo cart, request an immediate meeting, or confirm a callback date, time and timezone.

## Run

Requires Node.js 20.9 or later.

```sh
npm ci
npm run dev
```

Open [the store](http://127.0.0.1:3015/mall). Browsing works without credentials; voice startup shows a setup notice if credentials are missing.

## Enable live Maya

Configure `.env.local` using `.env.example` as the template:

- `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`: an Agora project with Conversational AI and the required avatar capability enabled.
- `MURF_API_KEY` and `MURF_VOICE_ID`: your Murf key and voice for streaming Falcon TTS. Set the voice value to a plain ID such as `Anisha`, not a JSON object copied from the voice settings.
- `ANAM_API_KEY` and `ANAM_AVATAR_ID`: Anam credentials and avatar identifier for the Agora Anam integration. If omitted, voice can run with the placeholder avatar.

ARES is the speech recognizer. LLM access uses Agora-managed credentials and the SDK’s supported default preset internally; no LLM key or model environment variable is required. Murf uses your own key (BYOK).

Restart Next.js after filling credentials. Select any product to start Maya automatically. Allow microphone access if prompted; Maya introduces herself and briefly describes your selection. Later product clicks update the same voice session. Mute, End and retry controls remain available.

Credentials stay server-side. `.env.local` is ignored; do not commit populated secrets. Provider accounts and usage are external to this demo. This implementation uses the US Agora service area, English ASR, and a maximum 30-minute session.

For diagnostic timings open [/mall?debugLatency=true](http://127.0.0.1:3015/mall?debugLatency=true). Provider-internal LLM and TTS timings are deliberately shown as unavailable when not observable over the chosen RTC transport.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Stop the dev server before `npm start`, which uses the same port (3015).

See [PASS2.md](./PASS2.md) for the integration architecture, all 31 requested report items, validation evidence and live acceptance checklist. Local QA screenshots, recordings and diagnostic reports are excluded from this repository.

Sessions, meeting rooms and callback requests are process-local for this standalone demo and reset when the server restarts. Callback confirmation records a demo request; it does not create a calendar booking, send reminders, or dispatch a representative. Checkout does not place a real order.

The session registry is process-local for this standalone demo. A multi-instance deployment needs shared session coordination and application authentication before public use.
