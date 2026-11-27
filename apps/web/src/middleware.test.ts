import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth0", () => ({
  auth0: {
    middleware: vi.fn(async () => NextResponse.next()),
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

import { middleware } from "./middleware";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://app.test${path}`, cookie ? { headers: { cookie } } : undefined);
}

beforeEach(() => getSession.mockReset());

describe("middleware", () => {
  it("lets a signed-in user through", async () => {
    getSession.mockResolvedValue({ user: { sub: "auth0|u1" } });
    const res = await middleware(request("/organizations", "bnts_signed_in=1"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends an expired session to Sign in with the message and clears the marker", async () => {
    getSession.mockResolvedValue(null);
    const res = await middleware(request("/organizations", "bnts_signed_in=1"));
    expect(res.headers.get("location")).toBe("http://app.test/signin?reason=session-ended");
    expect(res.headers.get("set-cookie")).toContain("bnts_signed_in=;");
  });

  it("sends a first-time visitor to plain Sign in", async () => {
    getSession.mockResolvedValue(null);
    const res = await middleware(request("/organizations"));
    expect(res.headers.get("location")).toBe("http://app.test/signin");
  });

  it("leaves Sign in and the Auth0 routes alone without a session", async () => {
    getSession.mockResolvedValue(null);
    for (const path of ["/signin", "/auth/login", "/auth/callback"]) {
      const res = await middleware(request(path));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("answers an API call after expiry with 401 instead of a redirect", async () => {
    getSession.mockResolvedValue(null);
    for (const cookie of ["bnts_signed_in=1", undefined]) {
      const res = await middleware(request("/api/session", cookie));
      expect(res.status).toBe(401);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("clears the marker when an API call finds the session expired", async () => {
    getSession.mockResolvedValue(null);
    const res = await middleware(request("/api/session", "bnts_signed_in=1"));
    expect(res.headers.get("set-cookie")).toContain("bnts_signed_in=;");
  });

  it("does not roll the session on the session probe", async () => {
    getSession.mockResolvedValue({ user: { sub: "auth0|u1" } });
    const { auth0 } = await import("@/lib/auth0");
    vi.mocked(auth0.middleware).mockClear();
    await middleware(request("/api/session", "bnts_signed_in=1"));
    expect(auth0.middleware).not.toHaveBeenCalled();
  });

  it("clears the marker on logout", async () => {
    const res = await middleware(request("/auth/logout", "bnts_signed_in=1"));
    expect(res.headers.get("set-cookie")).toContain("bnts_signed_in=;");
  });
});
