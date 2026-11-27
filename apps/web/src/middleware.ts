import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { SIGNED_IN_MARKER, resolveAccess } from "@/lib/session-guard";

export async function middleware(request: NextRequest) {
  const response = await auth0.middleware(request);
  const { pathname } = request.nextUrl;

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

  const redirect = NextResponse.redirect(new URL(decision.to, request.url));
  if (decision.clearMarker) redirect.cookies.delete(SIGNED_IN_MARKER);
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons.svg).*)"],
};
