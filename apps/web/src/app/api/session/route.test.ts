import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccessToken = vi.fn();
vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: () => getAccessToken() } }));

import { GET } from "./route";

beforeEach(() => {
  getAccessToken.mockReset();
  vi.unstubAllGlobals();
  process.env.API_BASE_URL = "http://api.test";
});

describe("GET /api/session", () => {
  it("is 401 when no access token can be obtained", async () => {
    getAccessToken.mockRejectedValue(new Error("no session"));
    expect((await GET()).status).toBe(401);
  });

  it("is 401 when the API answers 401", async () => {
    getAccessToken.mockResolvedValue({ token: "fake-token" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await GET()).status).toBe(401);
  });

  it("passes the signed-in user through", async () => {
    getAccessToken.mockResolvedValue({ token: "fake-token" });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ sub: "auth0|u1", role: "org_admin" }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sub: "auth0|u1", role: "org_admin" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/me", {
      headers: { Authorization: "Bearer fake-token" },
      cache: "no-store",
    });
  });

  it("is a 502 when the API is unreachable so the watcher does not sign the user out", async () => {
    getAccessToken.mockResolvedValue({ token: "fake-token" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    expect((await GET()).status).toBe(502);
  });
});
