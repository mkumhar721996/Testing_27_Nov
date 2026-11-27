"use client";

import { useEffect } from "react";

export const SESSION_POLL_MS = 60_000;
const SESSION_ENDED_URL = "/signin?reason=session-ended";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  // The middleware may bounce an expired session to Sign in; fetch follows that and reports a 200 page.
  const bouncedToSignIn = response.redirected && new URL(response.url).pathname === "/signin";
  if (response.status === 401 || bouncedToSignIn) window.location.assign(SESSION_ENDED_URL);
  return response;
}

export function SessionWatcher() {
  useEffect(() => {
    // Only a 401 ends the session; a network error or 5xx is ignored so a blip does not sign the user out.
    const probe = () => apiFetch("/api/session", { cache: "no-store" }).catch(() => undefined);
    const onVisible = () => {
      if (document.visibilityState === "visible") void probe();
    };
    const timer = setInterval(probe, SESSION_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
