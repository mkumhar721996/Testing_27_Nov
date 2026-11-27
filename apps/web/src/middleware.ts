import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { SIGNED_IN_MARKER, resolveAccess } from "@/lib/session-guard";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The watcher's probe must not roll the session, or an idle open tab would never expire.
  const response = pathname === "/api/session" ? NextResponse.next() : await auth0.middleware(request);

  if (pathname.startsWith("/auth/")) {
    if (pathname === "/auth/logout") response.cookies.delete(SIGNED_IN_MARKER);
    return response;
  }

  const session = await auth0.getSession(request);
  const decision = resolveAccess({
    pathname,
    hasSession: session !== null,
    hasMarker: request.cookies.has(SIGNED_IN_MARKER),
  });
  if (decision.action === "allow") return response;

  const denied =
    decision.action === "unauthorized"
      ? new NextResponse(null, { status: 401 })
      : NextResponse.redirect(new URL(decision.to, request.url));
  if (decision.clearMarker) denied.cookies.delete(SIGNED_IN_MARKER);
  return denied;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons.svg).*)"],
};
