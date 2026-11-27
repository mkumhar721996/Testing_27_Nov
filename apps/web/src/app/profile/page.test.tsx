import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "./page";

const cookieGet = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_BASE_URL", "http://api.test");
});

afterEach(() => {
  fetchMock.mockReset();
  cookieGet.mockReset();
  redirect.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Traveller profile landing", () => {
  it("shows the name and email from the API with no required preferences step", async () => {
    cookieGet.mockReturnValue({ value: "fake-token" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ name: "Amara Okafor", email: "amara.okafor@example.com" })),
    );
    render(await Profile());
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/me",
      expect.objectContaining({ headers: { Authorization: "Bearer fake-token" } }),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Amara Okafor");
    expect(screen.getByLabelText("Email")).toHaveValue("amara.okafor@example.com");
    expect(screen.queryByText(/required/i)).toBeNull();
  });

  it("redirects to sign-in without a session", async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(Profile()).rejects.toThrow("redirect:/sign-in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when the API rejects the token", async () => {
    cookieGet.mockReturnValue({ value: "fake-token" });
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(Profile()).rejects.toThrow("redirect:/sign-in");
  });
});
