import { NextResponse } from "next/server";
import { passwordSignIn } from "@/lib/auth0";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const result = await passwordSignIn(email, password);
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
