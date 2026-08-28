import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/unlock/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("RELAY_APP_SECRET", "s3cret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/unlock", () => {
  it("rejects a wrong secret", async () => {
    const res = await POST(request({ secret: "nope" }));
    expect(res.status).toBe(401);
  });

  it("sets the unlock cookie for the right secret", async () => {
    const res = await POST(request({ secret: "s3cret" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/relay_unlock=[a-f0-9]{64}/);
  });

  it("is a no-op when no secret is configured", async () => {
    vi.stubEnv("RELAY_APP_SECRET", "");
    const res = await POST(request({}));
    expect(res.status).toBe(200);
  });
});
