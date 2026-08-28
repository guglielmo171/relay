import { NextResponse } from "next/server";
import { unlockDigest } from "@/app/api/briefing/speak/route";

export const runtime = "nodejs";

/**
 * Minimal unlock for public deployments: knowing RELAY_APP_SECRET sets an
 * httpOnly cookie that lets this browser call the speak route. Not a user
 * system — just a credit guard.
 */
export async function POST(req: Request) {
  const secret = process.env.RELAY_APP_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  let provided: unknown;
  try {
    provided = (await req.json())?.secret;
  } catch {
    provided = undefined;
  }

  if (provided !== secret) {
    return NextResponse.json(
      { ok: false, error: "That secret didn't match." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("relay_unlock", unlockDigest(secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
