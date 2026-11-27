import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInPanel } from "./sign-in-panel";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(() => vi.unstubAllGlobals());

describe("SignInPanel", () => {
  it("hands off to the identity provider with a pending label", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<SignInPanel initial="default" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(assign).toHaveBeenCalledWith("/auth/login?returnTo=/organizations");
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("shows the inline error with Try again instead of the Sign in button", () => {
    render(<SignInPanel initial="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("Try again restores the button and removes the error", () => {
    render(<SignInPanel initial="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/signin");
  });

  it("shows the signed out notice above the Sign in button", () => {
    render(<SignInPanel initial="signed-out" />);
    expect(screen.getByRole("status")).toHaveTextContent("You signed out.");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the session ended notice", () => {
    render(<SignInPanel initial="session-ended" />);
    expect(screen.getByRole("status")).toHaveTextContent("Your session ended. Sign in again to continue.");
  });
});
