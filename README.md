# Relay

**Catch up before you code.**

Relay is a voice-first handoff tool for engineers. When you resume work after
a context switch, the information you need is usually fragmented across
messages, tickets, and memory. Relay turns a structured technical handoff —
what changed, what's blocked, what's waiting on you, what's next — into a
short spoken briefing you can listen to before you start working.

> Here's your handoff for Checkout and payments. Since your last session: The
> authentication refactor was deployed to production yesterday. … Your first
> priority today: validate the checkout regression on staging.

Built with Next.js (App Router), React, TypeScript, shadcn/ui, and the
ElevenLabs Text to Speech API.

---

## Why voice

Reading a handoff and *hearing* one are different jobs. A form dumps
equal-weight fields on you; a spoken briefing is linear, time-boxed, and
forced to pick a first priority. Relay's voice layer exists to deliver
**order and emphasis**, while the structured editor stays on screen for
facts and detail. The product is designed to still make sense if you never
learn ElevenLabs is underneath it.

## The product in one loop

1. Write (or load the sample) structured handoff — one item per line.
2. Watch the spoken script compile live as you type. No LLM, no wait.
3. Press **Listen to briefing**. Audio streams from ElevenLabs and plays.
4. Pause, stop, scrub, change speed, or edit and regenerate. Editing marks
   the audio stale; replaying an unchanged script never re-calls the API.

## Quickstart

```bash
npm install
cp .env.example .env.local   # then paste your ElevenLabs key
npm run dev
```

Open http://localhost:3000 and choose **Load the sample handoff**.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | for voice | Server-side only. Never exposed to the client bundle. |
| `ELEVENLABS_VOICE_ID` | no | Override the curated default voice with any premade voice ID. |
| `RELAY_APP_SECRET` | no | When set, voice generation requires a one-time unlock per browser. Recommended for public deploys so strangers can't spend your credits. |

Without a key, the editor and live script preview still work — the app tells
you exactly what is missing instead of failing mysteriously.

## How ElevenLabs is used

Deliberate choices, not defaults:

- **TTS, not Conversational AI.** Relay is a briefing, not a chatbot. The
  `text-to-speech` endpoint is the right tool; an agent would be demo
  frosting on the wrong product.
- **`eleven_flash_v2_5`.** A briefing is requested while a user is waiting,
  so time-to-first-audio matters more than studio fidelity. Flash's ~75 ms
  inference and 40k-character headroom fit a ~60-second brief perfectly, at
  half the per-character cost of Multilingual v2.
- **HTTP streaming through a Route Handler.** `POST /api/briefing/speak`
  validates the payload, compiles the script server-side, and pipes the
  SDK's stream straight to the client as `audio/mpeg`. The API key never
  leaves the server. WebSocket stream-input is intentionally skipped: the
  full script already exists, so a persistent connection buys nothing.
- **Latency honesty.** The client collects the short stream into a blob
  before playback, which keeps MP3 decoding reliable across browsers. The
  generating state is designed and brief; if a measured wait ever exceeds
  ~3 s, the upgrade path is progressive playback, not a spinner.
- **Cost respect.** Generated audio is cached in-session keyed by script
  content, so replaying an unchanged briefing is free. Stop aborts the
  in-flight request — including the upstream ElevenLabs stream.
- **Speech normalization.** Flash's text normalization is minimal, so the
  compiler pre-processes developer jargon: `PR #412` becomes "pull request
  412", `checkoutFlow` becomes "checkout flow", URLs reduce to their spoken
  host.

## The compiler is the product

There is no LLM in the loop. `lib/briefing/compile.ts` deterministically
turns structured fields into a ~45–90 second script:

- Empty sections are omitted, not padded.
- Bullets are capped per section; the script progressively sheds detail to
  stay under its character budget.
- It opens with orientation ("Here's your handoff for …") and always closes
  on the first priority — or the most urgent blocker when no next action
  exists.

This makes the briefing testable, instant, offline-demoable, and free of
generic-assistant drift. An LLM "tighten this" pass is a plausible future
layer, not a foundation.

## Architecture

```
Handoff form ──▶ compileBriefing (shared, deterministic)
                      │
                      ├─▶ live script preview (client)
                      └─▶ POST /api/briefing/speak (server, Node runtime)
                               │  validate → compile → stream
                               ▼
                     ElevenLabs textToSpeech.stream
                               │  audio/mpeg
                               ▼
                 session-cached blob ▶ HTMLAudioElement player
```

| Client owns | Server owns |
| --- | --- |
| Editor, list, script preview, player | ElevenLabs SDK + API key |
| `localStorage` persistence | Payload validation, script compile |
| Abort, session audio cache, playback UX | Provider error mapping, optional unlock gate |

No database, no auth system, no queue, no provider abstraction. The state
that survives a refresh is the handoffs themselves; everything else is
deliberately ephemeral.

## Project structure

```
app/
  page.tsx                     single-screen workspace
  api/briefing/speak/route.ts  TTS boundary (server-only)
  api/unlock/route.ts          optional secret unlock
components/
  handoff-editor.tsx           structured sections, one item per line
  handoff-list.tsx             recent handoffs
  briefing-panel.tsx           script preview + player column
  briefing-player.tsx          play/pause/stop/seek/speed/regenerate
  empty-state.tsx
hooks/
  use-handoffs.ts              localStorage-backed state
  use-briefing-player.ts       audio lifecycle, cache, aborts
lib/
  briefing/compile.ts          the spoken-script compiler (core logic)
  briefing/normalize.ts        jargon → speech-friendly text
  handoffs/                    schema, sample, store
  elevenlabs/                  client factory, error mapping
```

## Testing

`npm test` runs Vitest over the parts that carry product risk:

- **Compiler** — section skipping, priority close, bullet caps, character
  budget, speech normalization, the sample handoff end-to-end.
- **Validation** — empty/oversized/malformed handoffs.
- **API boundary** — invalid bodies, missing key, provider 429/5xx mapping,
  and the optional secret gate, with the ElevenLabs client mocked.

The last mile is manual by design: generate the sample briefing and listen
to it. Voice quality is a human judgment, not an assertion.

## Design

Dark-first, neutral, editorial. The briefing column is the hero; the editor
is a quiet working surface. shadcn/ui provides the component foundation;
the script preview is set in a serif face to distinguish *the spoken word*
from working text. All five player states (idle, generating, playing,
paused, error/locked) are designed states, not leftover spinners.

## Roadmap

Deliberately out of the MVP, in the order they'd earn their way in:

1. GitHub ingestion (recent PRs/reviews pre-fill the handoff)
2. Optional LLM "tighten" pass on the compiled script
3. Progressive playback (MediaSource) if measured wait demands it
4. Shareable handoff links

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |

## What Relay demonstrates

- Product-oriented React/Next.js development
- Server-side third-party API integration
- Deterministic domain logic instead of unnecessary LLM usage
- Audio lifecycle and failure-state UX
- Secure handling of external API credentials
- Unit and API-boundary testing
