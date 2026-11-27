import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as signIn } from "./sign-in/route";
import { POST as signUp } from "./sign-up/route";

const fetchMock = vi.fn();

function req(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AUTH0_DOMAIN", "tenant.example.com");
  vi.stubEnv("AUTH0_CLIENT_ID", "fake-client-id");
  vi.stubEnv("AUTH0_CLIENT_SECRET", "fake-client-secret");
  vi.stubEnv("AUTH0_AUDIENCE", "https://api.example.com");
  vi.stubEnv("AUTH0_DB_CONNECTION", "Username-Password-Authentication");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/auth/sign-in", () => {
  const body = { email: "a@example.com", password: "test-password" };

  it("sets an httpOnly session cookie and returns ok on success", async () => {
    fetchMock.mockResolvedValue(json(200, { access_token: "fake-token", expires_in: 600 }));
    const res = await signIn(req("/api/auth/sign-in", body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toMatch(/session=fake-token.*HttpOnly/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tenant.example.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.grant_type).toBe("http://auth0.com/oauth/grant-type/password-realm");
  });

  it("returns 401 invalid_credentials when Auth0 rejects the credentials", async () => {
    fetchMock.mockResolvedValue(
      json(403, { error: "invalid_grant", error_description: "Wrong email or password." }),
    );
    const res = await signIn(req("/api/auth/sign-in", body));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "invalid_credentials" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns 403 email_not_verified and no cookie for an unverified email", async () => {
    fetchMock.mockResolvedValue(
      json(403, {
        error: "access_denied",
        error_description: "Please verify your email before logging in.",
      }),
    );
    const res = await signIn(req("/api/auth/sign-in", body));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: "email_not_verified", email: "a@example.com" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns 502 unavailable when Auth0 cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const res = await signIn(req("/api/auth/sign-in", body));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ code: "unavailable" });
  });

  it("returns 401 invalid_credentials for a missing password without calling Auth0", async () => {
    const res = await signIn(req("/api/auth/sign-in", { email: "a@example.com" }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/sign-up", () => {
  const body = { name: "Lena Hartmann", email: "lena@example.com", password: "test-password" };

  it("creates the account at Auth0 and asks for email verification", async () => {
    fetchMock.mockResolvedValue(json(200, { _id: "1", email: "lena@example.com" }));
    const res = await signUp(req("/api/auth/sign-up", body));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/dbconnections/signup"),
      expect.anything(),
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toMatchObject({
      email: "lena@example.com",
      password: "test-password",
      name: "Lena Hartmann",
      connection: "Username-Password-Authentication",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ code: "verify_email", email: "lena@example.com" });
  });

  it("returns 400 sign_up_rejected when Auth0 rejects the sign-up", async () => {
    fetchMock.mockResolvedValue(json(400, { code: "user_exists" }));
    const res = await signUp(req("/api/auth/sign-up", body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "sign_up_rejected" });
  });
});
