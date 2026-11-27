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

  it("clears the marker on logout", async () => {
    const res = await middleware(request("/auth/logout", "bnts_signed_in=1"));
    expect(res.headers.get("set-cookie")).toContain("bnts_signed_in=;");
  });
});
