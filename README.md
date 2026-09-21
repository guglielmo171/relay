# Relay

**Catch up before you code.**

Relay is a voice-first handoff tool for software engineers. It turns a structured technical handoff — what changed, what's blocked, what's waiting on you and what's next — into a short spoken briefing designed for context recovery after a switch in work.

[Live Demo](https://relay-swart-omega.vercel.app)

Built with Next.js App Router, React, TypeScript, shadcn/ui and the ElevenLabs Text to Speech API.

---

## Engineering snapshot

Relay is intentionally small in scope, but the frontend and integration work is not just a static UI demo.

- **Frontend lifecycle** — explicit idle, generating, playing, paused and error states around an `HTMLAudioElement`-based player.
- **Cancellation and cleanup** — `AbortController` cancels in-flight generation; request aborts are propagated to the upstream audio stream; object URLs and audio state are cleaned up when they are no longer needed.
- **Bounded session caching** — generated audio is cached by compiled-script content with a fixed cache limit and URL revocation on eviction.
- **Stale-state handling** — editing a handoff after audio generation marks the existing audio stale and changes the next action from replay to regenerate.
- **Client/server boundary** — the browser owns editing, local persistence and playback; a Next.js Route Handler owns provider credentials, payload validation, server-side compilation and provider-error mapping.
- **Deterministic product logic** — a plain TypeScript compiler turns structured handoff data into a bounded spoken script instead of delegating the core behaviour to an LLM.
- **Behaviour-oriented tests** — Vitest covers compiler rules, validation and the server API boundary, including missing configuration, provider failures and the optional public-demo gate.

## The product in one loop

1. Write a structured handoff, or load the sample.
2. Watch the spoken script compile live as the handoff changes.
3. Generate the briefing through the server-side TTS boundary.
4. Play, pause, seek, change speed or stop the audio.
5. Edit the handoff and regenerate only when the compiled script has changed.

The voice layer is useful because a spoken briefing is linear and prioritised: the structured editor keeps the full detail on screen, while the briefing is forced to surface what matters first.

## Key engineering decisions

### Deterministic compiler instead of an LLM

The core product behaviour is deterministic. `lib/briefing/compile.ts` converts structured fields into a short script with explicit rules:

- empty sections are omitted;
- bullets are capped per section;
- detail is progressively reduced to stay within the script character budget;
- the briefing closes on the first next action, or falls back to the most urgent blocker / waiting item;
- developer terminology is normalised for speech.

An LLM could be added later as an optional refinement layer, but it is not required to make the core product useful or testable.

### TTS instead of conversational AI

Relay is a briefing tool, not a chatbot. The complete script already exists before audio generation, so a text-to-speech request matches the product better than an agent or open-ended conversational layer.

### HTTP boundary instead of a persistent WebSocket

`POST /api/briefing/speak` validates the structured handoff, compiles the script again on the server and requests the audio stream. The provider credential remains server-side.

A persistent WebSocket connection would add lifecycle complexity without solving a current product need because the full briefing input is already available at request time.

### Session cache instead of repeated provider calls

Generated audio is cached in-session by script content. Replaying an unchanged briefing reuses the existing object URL rather than requesting the provider again. The cache is bounded, and evicted object URLs are revoked.

When generation is stopped or the user switches handoffs, active work is cancelled and playback state is reset.

### Explicit boundaries instead of architecture for show

Relay deliberately has no database, user account system, queue or generic provider abstraction. Handoffs are persisted in `localStorage`; generated audio and playback state are ephemeral.

Those boundaries keep the implementation proportional to the product while still making server trust boundaries, validation, failure mapping and browser lifecycle explicit.

## Architecture

```text
Handoff form ──▶ compileBriefing (shared, deterministic)
                      │
                      ├─▶ live script preview (client)
                      └─▶ POST /api/briefing/speak (server, Node runtime)
                               │  validate → compile → provider request
                               ▼
                     ElevenLabs textToSpeech.stream
                               │  audio/mpeg
                               ▼
                    client Blob + object URL
                               │
                               ▼
                 bounded session cache + HTMLAudioElement
```

| Client owns | Server owns |
| --- | --- |
| Editor, handoff list, live script preview | ElevenLabs SDK + API key |
| `localStorage` persistence | Payload validation |
| Audio lifecycle, seek/speed controls, stale-state detection | Server-side script compilation |
| AbortController, session audio cache, object-URL cleanup | Provider error mapping + optional unlock gate |

The browser sends structured handoff data, not arbitrary freeform TTS text. The server validates that boundary and compiles the final provider input itself.

## Testing

`npm test` runs Vitest over the parts that carry product risk.

### Compiler behaviour

Coverage includes:

- empty-section omission;
- priority close and blocker fallback;
- per-section bullet limits;
- developer-jargon normalisation;
- script character-budget behaviour;
- the sample handoff as a complete compiler scenario.

### API boundary

The TTS Route Handler is tested with the provider client mocked. Tests cover:

- invalid / empty request bodies;
- successful audio responses;
- missing provider configuration;
- provider rate-limit failure mapping;
- the optional `RELAY_APP_SECRET` gate.

The final audio-quality check stays manual by design: hearing whether the generated briefing is useful is a product judgement, not something a unit assertion can prove.

## Design and UX states

Relay uses a dark, neutral, editorial interface where the briefing is the primary output and the editor remains a quieter working surface.

The player treats lifecycle states as explicit UX states rather than a generic loading spinner:

- idle;
- generating, with a stop action;
- playing / paused;
- provider or network error with retry;
- locked public-demo state with an unlock form;
- stale generated audio after the underlying handoff changes.

Playback includes pause/play, seek, stop, speed cycling and regenerate/replay behaviour.

## Quickstart

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and choose **Load the sample handoff**.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | For voice generation | Server-side provider credential. |
| `ELEVENLABS_VOICE_ID` | No | Overrides the default voice. |
| `RELAY_APP_SECRET` | No | Optional gate for voice generation on a public deployment. |

Without an ElevenLabs API key, the editor and deterministic live script preview still work; voice generation returns an explicit configuration error.

## Project structure

```text
app/
  page.tsx                     single-screen workspace
  api/briefing/speak/route.ts  server-side TTS boundary
  api/unlock/route.ts          optional public-demo unlock
components/
  handoff-editor.tsx           structured handoff editing
  handoff-list.tsx             recent handoffs
  briefing-panel.tsx           script preview + player
  briefing-player.tsx          player states and controls
  empty-state.tsx
hooks/
  use-handoffs.ts              localStorage-backed handoff state
  use-briefing-player.ts       audio lifecycle, cache, aborts and cleanup
lib/
  briefing/compile.ts          deterministic spoken-script compiler
  briefing/normalize.ts        speech-friendly developer terminology
  handoffs/                    schema, sample and persistence helpers
  elevenlabs/                  provider client and error mapping
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build + TypeScript validation |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |

## Roadmap

Deliberately outside the current MVP, in the order they would need to justify their complexity:

1. GitHub ingestion to pre-fill recent engineering context;
2. optional LLM refinement after deterministic compilation;
3. progressive playback if measured waiting time warrants it;
4. shareable handoff links.
