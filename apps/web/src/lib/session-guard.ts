export const SIGNED_IN_MARKER = "bnts_signed_in";

type AccessInput = { pathname: string; hasSession: boolean; hasMarker: boolean };

export type AccessDecision =
  | { action: "allow" }
  | { action: "redirect"; to: "/signin" | "/signin?reason=session-ended"; clearMarker: boolean };

function isPublic(pathname: string): boolean {
  return pathname === "/signin" || pathname === "/auth" || pathname.startsWith("/auth/");
}

export function resolveAccess({ pathname, hasSession, hasMarker }: AccessInput): AccessDecision {
  if (hasSession || isPublic(pathname)) return { action: "allow" };
  return hasMarker
    ? { action: "redirect", to: "/signin?reason=session-ended", clearMarker: true }
    : { action: "redirect", to: "/signin", clearMarker: false };
}
