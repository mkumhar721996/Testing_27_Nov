import { beforeEach, describe, expect, it, vi } from "vitest";

type Config = {
  session: { rolling: boolean; inactivityDuration: number; absoluteDuration: number };
  onCallback: (
    error: Error | null,
    ctx: { appBaseUrl?: string; returnTo?: string },
    session: unknown,
  ) => Promise<Response>;
};

const captured = vi.hoisted(() => ({ config: null as unknown }));

vi.mock("@auth0/nextjs-auth0/server", () => ({
  Auth0Client: class {
    constructor(config: unknown) {
      captured.config = config;
    }
  },
}));

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  await import("./auth0");
  return captured.config as Config;
}

beforeEach(() => vi.unstubAllEnvs());

describe("auth0 client", () => {
  it("uses rolling sessions with the default lengths", async () => {
    const { session } = await load();
    expect(session).toEqual({ rolling: true, inactivityDuration: 1800, absoluteDuration: 28800 });
  });

  it("reads the session lengths from settings", async () => {
    const { session } = await load({
      SESSION_INACTIVITY_SECONDS: "90",
      SESSION_ABSOLUTE_SECONDS: "120",
    });
    expect(session.inactivityDuration).toBe(90);
    expect(session.absoluteDuration).toBe(120);
  });

  it("lands on Organizations after a successful callback and sets the marker", async () => {
    const { onCallback } = await load({ SESSION_ABSOLUTE_SECONDS: "120" });
    const res = await onCallback(null, { appBaseUrl: "http://app.test", returnTo: "/organizations" }, {});
    expect(res.headers.get("location")).toBe("http://app.test/organizations");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("bnts_signed_in=1");
    expect(cookie).toContain("Max-Age=120");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("defaults to Organizations when no return target is given", async () => {
    const { onCallback } = await load();
    const res = await onCallback(null, { appBaseUrl: "http://app.test" }, {});
    expect(res.headers.get("location")).toBe("http://app.test/organizations");
  });

  it("sends a failed sign-in to the Sign in error state without a marker", async () => {
    const { onCallback } = await load();
    const res = await onCallback(new Error("denied"), { appBaseUrl: "http://app.test" }, null);
    expect(res.headers.get("location")).toBe("http://app.test/signin?error=signin-failed");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
