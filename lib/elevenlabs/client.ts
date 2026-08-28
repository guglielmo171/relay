import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const MODEL_ID = "eleven_flash_v2_5";
export const OUTPUT_FORMAT = "mp3_44100_128";

/** George — a calm, neutral premade voice. Override with ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

let cached: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  cached ??= new ElevenLabsClient({ apiKey });
  return cached;
}

export function getVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
}

/** Moderate stability keeps a technical briefing calm instead of performative. */
export const VOICE_SETTINGS = {
  stability: 0.6,
  similarityBoost: 0.75,
  speed: 1.0,
} as const;
