import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { SIGNED_IN_MARKER } from "./session-guard";

const inactivityDuration = Number(process.env.SESSION_INACTIVITY_SECONDS ?? 1800);
const absoluteDuration = Number(process.env.SESSION_ABSOLUTE_SECONDS ?? 28800);

export const auth0 = new Auth0Client({
  session: { rolling: true, inactivityDuration, absoluteDuration },
  authorizationParameters: { audience: process.env.AUTH0_AUDIENCE },
  async onCallback(error, context) {
    const base = context.appBaseUrl ?? process.env.APP_BASE_URL ?? "";
    if (error) return NextResponse.redirect(new URL("/signin?error=signin-failed", base));
    const response = NextResponse.redirect(new URL(context.returnTo || "/organizations", base));
    response.cookies.set(SIGNED_IN_MARKER, "1", { maxAge: absoluteDuration, path: "/" });
    return response;
  },
});
