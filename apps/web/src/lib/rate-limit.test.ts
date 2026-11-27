import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, rateLimited, resetRateLimits, sizeForTest } from "./rate-limit";

beforeEach(resetRateLimits);

describe("rateLimited", () => {
  it("blocks after the limit and resets after the window", () => {
    expect(rateLimited("k", 2, 1000, 0)).toBe(false);
    expect(rateLimited("k", 2, 1000, 1)).toBe(false);
    expect(rateLimited("k", 2, 1000, 2)).toBe(true);
    expect(rateLimited("k", 2, 1000, 1000)).toBe(false);
  });

  it("keeps memory bounded when flooded with unique live keys", () => {
    for (let i = 0; i < 10_500; i++) rateLimited(`k${i}`, 1, 60_000, 0);
    expect(sizeForTest()).toBeLessThanOrEqual(10_000);
  });
});

describe("clientIp", () => {
  it("returns null without a forwarded header", () => {
    expect(clientIp(new Request("http://localhost"))).toBeNull();
  });
});
