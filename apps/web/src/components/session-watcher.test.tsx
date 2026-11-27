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

  it("returns to Sign in when the probe was redirected to Sign in", async () => {
    stubFetch(() => {
      const res = new Response("<html></html>", { status: 200 });
      Object.defineProperty(res, "redirected", { value: true });
      Object.defineProperty(res, "url", { value: "http://app.test/signin?reason=session-ended" });
      return Promise.resolve(res);
    });
    render(<SessionWatcher />);
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

  it("does not redirect while the session is still valid", async () => {
    stubFetch(() => Promise.resolve(Response.json({ sub: "auth0|u1", role: "org_admin" })));
    render(<SessionWatcher />);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(assign).not.toHaveBeenCalled();
  });

  it("probes straight away when the tab becomes visible", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    render(<SessionWatcher />);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(assign).toHaveBeenCalledWith("/signin?reason=session-ended");
  });

  it("does not probe when the tab is hidden", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<SessionWatcher />);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("stops polling after unmount", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    const { unmount } = render(<SessionWatcher />);
    unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("apiFetch passes a successful response through without redirecting", async () => {
    stubFetch(() => Promise.resolve(new Response("ok", { status: 200 })));
    const res = await apiFetch("/api/anything");
    expect(res.status).toBe(200);
    expect(assign).not.toHaveBeenCalled();
  });

  it("apiFetch redirects on a 401", async () => {
    stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
    const res = await apiFetch("/api/anything");
    expect(res.status).toBe(401);
    expect(assign).toHaveBeenCalledWith("/signin?reason=session-ended");
  });
});
