import { afterEach, describe, expect, it, vi } from "vitest";
import { passwordSignIn } from "./auth0";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("passwordSignIn", () => {
  it("is unavailable, without calling Auth0, when the tenant is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("AUTH0_DOMAIN", "");
    expect(await passwordSignIn("a@example.com", "test-password")).toEqual({
      kind: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
