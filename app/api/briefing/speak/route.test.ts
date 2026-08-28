import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function fakeAudioStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("fake-mp3-bytes"));
      controller.close();
    },
  });
}

const streamMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/elevenlabs/client", () => ({
  MODEL_ID: "eleven_flash_v2_5",
  OUTPUT_FORMAT: "mp3_44100_128",
  VOICE_SETTINGS: { stability: 0.6, similarityBoost: 0.75, speed: 1.0 },
  getVoiceId: () => "voice-test",
  getElevenLabsClient: () => ({ textToSpeech: { stream: streamMock } }),
}));

import { POST } from "@/app/api/briefing/speak/route";

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/briefing/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validHandoff = {
  id: "h1",
  title: "Checkout",
  updatedAt: Date.now(),
  changes: ["Shipped the auth refactor"],
  blockers: [],
  waitingOnYou: [],
  nextActions: ["Validate the checkout regression"],
  context: [],
};

beforeEach(() => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
  vi.stubEnv("RELAY_APP_SECRET", "");
  streamMock.mockReset();
  streamMock.mockResolvedValue(fakeAudioStream());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/briefing/speak", () => {
  it("rejects an invalid body with 400", async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
  });

  it("rejects a handoff with nothing to speak", async () => {
    const res = await POST(request({ handoff: { title: "Quiet day" } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/nothing to speak/i);
  });

  it("streams audio for a valid handoff", async () => {
    const res = await POST(request({ handoff: validHandoff }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(await res.text()).toBe("fake-mp3-bytes");

    const [voiceId, options] = streamMock.mock.calls[0];
    expect(voiceId).toBe("voice-test");
    expect(options.modelId).toBe("eleven_flash_v2_5");
    expect(options.text).toContain("Here's your handoff for Checkout.");
  });

  it("returns 503 with a product message when the provider is busy", async () => {
    streamMock.mockRejectedValue({ statusCode: 429 });
    const res = await POST(request({ handoff: validHandoff }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/busy/i);
  });

  it("returns 503 when the API key is missing", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const res = await POST(request({ handoff: validHandoff }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("missing_key");
  });

  it("locks voice behind RELAY_APP_SECRET when set", async () => {
    vi.stubEnv("RELAY_APP_SECRET", "s3cret");

    const locked = await POST(request({ handoff: validHandoff }));
    expect(locked.status).toBe(401);
    expect((await locked.json()).code).toBe("locked");

    const digest = createHash("sha256").update("s3cret").digest("hex");
    const unlocked = await POST(
      request({ handoff: validHandoff }, { cookie: `relay_unlock=${digest}` }),
    );
    expect(unlocked.status).toBe(200);
  });
});
