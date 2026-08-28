# Relay

**Catch up before you code.** Relay turns a structured engineering handoff into
a short spoken briefing you can listen to before you start working.

Write what changed, what's blocked, what's waiting on you, and your next
actions. Relay compiles it into a concise spoken script (deterministically —
no LLM) and reads it aloud with ElevenLabs.

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
| `ELEVENLABS_API_KEY` | for voice | Server-side only. Never exposed to the client. |
| `ELEVENLABS_VOICE_ID` | no | Override the curated default voice. |
| `RELAY_APP_SECRET` | no | When set, voice generation requires a one-time unlock. Recommended for public deploys so strangers can't spend your credits. |

Without a key, the editor and the live script preview still work; the app
says exactly what is missing instead of failing mysteriously.

## How it works

```
Handoff form ──▶ compileBriefing (shared, deterministic)
                      │
                      ├─▶ live script preview (client)
                      └─▶ POST /api/briefing/speak (server)
                               │  validate → compile → stream
                               ▼
                          ElevenLabs (eleven_flash_v2_5)
                               │  audio/mpeg stream
                               ▼
                    session-cached blob ▶ HTMLAudioElement player
```

- **No database.** Handoffs persist in `localStorage`; audio lives in an
  in-session cache keyed by script, so replaying an unchanged briefing never
  re-bills ElevenLabs.
- **The compiler is the product.** `lib/briefing/compile.ts` skips empty
  sections, caps length at ~90 seconds, normalizes jargon (`PR #412` →
  "pull request 412", `checkoutFlow` → "checkout flow"), and always closes on
  your first priority.
- **Stop really stops.** Stopping or switching handoffs aborts the in-flight
  request, including upstream ElevenLabs work.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build + typecheck |
| `npm test` | Vitest — compiler, schema, and API boundary |
| `npm run lint` | ESLint |

## Testing

Unit tests cover the briefing compiler (section skipping, priority close,
length caps, speech normalization), handoff validation, and the speak/unlock
routes with a mocked ElevenLabs client. The remaining check is manual and
worth doing: generate the sample briefing and listen to it end-to-end.
