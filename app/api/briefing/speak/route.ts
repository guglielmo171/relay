import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { compileBriefing, SCRIPT_CHAR_CAP } from "@/lib/briefing/compile";
import {
  getElevenLabsClient,
  getVoiceId,
  MODEL_ID,
  OUTPUT_FORMAT,
  VOICE_SETTINGS,
} from "@/lib/elevenlabs/client";
import { mapElevenLabsError } from "@/lib/elevenlabs/errors";
import { validateHandoff } from "@/lib/handoffs/schema";

export const runtime = "nodejs";

export function unlockDigest(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function isUnlocked(req: Request): boolean {
  const secret = process.env.RELAY_APP_SECRET;
  if (!secret) return true;
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(/;\s*/)
    .find((part) => part.startsWith("relay_unlock="));
  return match?.split("=")[1] === unlockDigest(secret);
}

export async function POST(req: Request) {
  if (!isUnlocked(req)) {
    return NextResponse.json(
      {
        code: "locked",
        error: "Voice is locked on this Relay instance. Enter the app secret to enable it.",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = validateHandoff((body as { handoff?: unknown })?.handoff);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // The script is compiled server-side from the structured handoff — the
  // client never supplies freeform TTS text.
  const script = compileBriefing(parsed.value);
  if (!script || script.length > SCRIPT_CHAR_CAP) {
    return NextResponse.json(
      { error: "Nothing to speak yet — add at least one item." },
      { status: 400 },
    );
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      {
        code: "missing_key",
        error:
          "Voice isn't configured on this server. Set ELEVENLABS_API_KEY and try again.",
      },
      { status: 503 },
    );
  }

  try {
    const audio = await getElevenLabsClient().textToSpeech.stream(
      getVoiceId(),
      {
        text: script,
        modelId: MODEL_ID,
        outputFormat: OUTPUT_FORMAT,
        voiceSettings: { ...VOICE_SETTINGS },
      },
    );

    // If the listener stops or navigates away, cancel the upstream work.
    req.signal.addEventListener("abort", () => void audio.cancel());

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const mapped = mapElevenLabsError(error);
    return NextResponse.json(
      { code: mapped.code, error: mapped.message },
      { status: mapped.status },
    );
  }
}
