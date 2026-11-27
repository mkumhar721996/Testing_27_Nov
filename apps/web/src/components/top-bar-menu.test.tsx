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

  it("closes on an outside click", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("stays open on a click inside the menu", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("moves focus to the first item when opened and keeps it there on arrow keys", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    const item = screen.getByRole("menuitem", { name: "Sign out" });
    expect(item).toHaveFocus();
    fireEvent.keyDown(item, { key: "ArrowDown" });
    expect(item).toHaveFocus();
    fireEvent.keyDown(item, { key: "ArrowUp" });
    expect(item).toHaveFocus();
  });

  it("returns focus to the Account button on Escape", () => {
    render(<TopBar />);
    const button = screen.getByRole("button", { name: /account/i });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Sign out" }), { key: "Escape" });
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles closed when the Account button is clicked again", () => {
    render(<TopBar />);
    const button = screen.getByRole("button", { name: /account/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: /account/i }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Sign out" }), { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
