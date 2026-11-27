import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./session-watcher", () => ({ SessionWatcher: () => null }));

import { TopBar } from "./top-bar";

describe("TopBar menu", () => {
  it("offers Sign out that leaves through the logout route", () => {
    render(<TopBar />);
    const button = screen.getByRole("button", { name: /account/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/auth/logout?returnTo=/signin%3Freason%3Dsigned-out",
    );
  });

  it("closes on Escape", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Sign out" }), { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
