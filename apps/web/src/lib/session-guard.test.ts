import { describe, expect, it } from "vitest";
import { resolveAccess } from "./session-guard";

describe("resolveAccess", () => {
  it("allows a signed-in user", () => {
    expect(resolveAccess({ pathname: "/organizations", hasSession: true, hasMarker: true })).toEqual({
      action: "allow",
    });
  });

  it("allows the public paths without a session", () => {
    expect(resolveAccess({ pathname: "/signin", hasSession: false, hasMarker: false })).toEqual({
      action: "allow",
    });
    expect(resolveAccess({ pathname: "/auth/login", hasSession: false, hasMarker: false })).toEqual({
      action: "allow",
    });
  });

  it("sends an expired session to Sign in with the session ended message", () => {
    expect(resolveAccess({ pathname: "/organizations", hasSession: false, hasMarker: true })).toEqual({
      action: "redirect",
      to: "/signin?reason=session-ended",
      clearMarker: true,
    });
  });

  it("answers an API path without a session with unauthorized, not a redirect", () => {
    expect(resolveAccess({ pathname: "/api/session", hasSession: false, hasMarker: true })).toEqual({
      action: "unauthorized",
      clearMarker: true,
    });
    expect(resolveAccess({ pathname: "/api/x", hasSession: false, hasMarker: false })).toEqual({
      action: "unauthorized",
      clearMarker: false,
    });
  });

  it("sends a visitor who never signed in to plain Sign in", () => {
    expect(resolveAccess({ pathname: "/organizations", hasSession: false, hasMarker: false })).toEqual({
      action: "redirect",
      to: "/signin",
      clearMarker: false,
    });
  });
});
