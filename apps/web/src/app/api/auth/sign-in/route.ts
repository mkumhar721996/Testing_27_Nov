import { NextResponse } from "next/server";
import { passwordSignIn } from "@/lib/auth0";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 30;
const EMAIL_LIMIT = 10;

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const ip = clientIp(request);
  // The email limit is scoped to the caller's IP so a third party cannot lock a victim out;
  // without a trusted IP we rely on Auth0's own brute-force protection.
  if (
    ip &&
    (rateLimited(`sign-in:ip:${ip}`, IP_LIMIT, WINDOW_MS) ||
      rateLimited(`sign-in:ip-email:${ip}:${email.trim().toLowerCase()}`, EMAIL_LIMIT, WINDOW_MS))
  ) {
    return NextResponse.json(
      { code: "too_many_attempts" },
      { status: 429, headers: { "retry-after": String(WINDOW_MS / 1000) } },
    );
  }

  const result = await passwordSignIn(email, password, ip);

  switch (result.kind) {
    case "ok": {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("session", result.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: result.expiresIn,
      });
      return res;
    }
    case "invalid_credentials":
      return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
    case "email_not_verified":
      return NextResponse.json({ code: "email_not_verified", email }, { status: 403 });
    default:
      return NextResponse.json({ code: "unavailable" }, { status: 502 });
  }
}
