import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionWatcher, apiFetch } from "./session-watcher";

const assign = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  assign.mockReset();
  vi.stubGlobal("location", { ...window.location, assign });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("SessionWatcher", () => {
  it("returns to Sign in when the session probe answers 401", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    render(
      <>
        <div role="dialog">Detail panel</div>
        <SessionWatcher />
      </>,
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(assign).toHaveBeenCalledWith("/signin?reason=session-ended");
  });

  it("ignores a 500", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 500 })));
    render(<SessionWatcher />);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(assign).not.toHaveBeenCalled();
  });

  it("ignores a network failure", async () => {
    stubFetch(() => Promise.reject(new TypeError("offline")));
    render(<SessionWatcher />);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(assign).not.toHaveBeenCalled();
  });

  it("apiFetch redirects on a 401", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    const res = await apiFetch("/api/anything");
    expect(res.status).toBe(401);
    expect(assign).toHaveBeenCalledWith("/signin?reason=session-ended");
  });
});
