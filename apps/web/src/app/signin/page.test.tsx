import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const redirect = vi.fn();
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: () => getSession() } }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => redirect(to),
  useRouter: () => ({ replace: vi.fn() }),
}));

import SignInPage from "./page";

async function renderPage(searchParams: Record<string, string>) {
  render(await SignInPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("Sign in page", () => {
  beforeEach(() => {
    getSession.mockResolvedValue(null);
    redirect.mockReset();
  });

  it("renders the error state for a failed sign-in", async () => {
    await renderPage({ error: "signin-failed" });
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed.");
  });

  it("renders the signed out notice", async () => {
    await renderPage({ reason: "signed-out" });
    expect(screen.getByRole("status")).toHaveTextContent("You signed out.");
  });

  it("renders the session ended notice", async () => {
    await renderPage({ reason: "session-ended" });
    expect(screen.getByRole("status")).toHaveTextContent("Your session ended.");
  });

  it("shows the plain Sign in screen for no parameters or an unknown reason", async () => {
    await renderPage({ reason: "anything-else" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the error rather than a notice when both are given", async () => {
    await renderPage({ error: "signin-failed", reason: "session-ended" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("goes to Organizations when a session exists", async () => {
    getSession.mockResolvedValue({ user: { sub: "auth0|u1" } });
    await renderPage({});
    expect(redirect).toHaveBeenCalledWith("/organizations");
  });
});
