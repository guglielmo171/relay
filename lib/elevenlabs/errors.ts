interface MappedError {
  status: number;
  code: string;
  message: string;
}

function statusOf(error: unknown): number {
  const candidate = error as { statusCode?: unknown; status?: unknown };
  const status = candidate?.statusCode ?? candidate?.status;
  return typeof status === "number" ? status : 500;
}

/** Turns SDK/provider failures into product errors — never raw stack traces. */
export function mapElevenLabsError(error: unknown): MappedError {
  const status = statusOf(error);

  if (status === 401 || status === 403) {
    return {
      status: 502,
      code: "provider_auth",
      message:
        "The voice API key was rejected. Check ELEVENLABS_API_KEY on the server.",
    };
  }
  if (status === 429) {
    return {
      status: 503,
      code: "provider_busy",
      message: "The briefing service is busy. Retry in a moment.",
    };
  }
  if (status >= 500) {
    return {
      status: 503,
      code: "provider_down",
      message: "The briefing service is unavailable right now. Retry in a moment.",
    };
  }
  return {
    status: 502,
    code: "provider_error",
    message: "Voice generation failed. Retry in a moment.",
  };
}
