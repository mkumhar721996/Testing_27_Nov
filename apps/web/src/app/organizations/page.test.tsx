import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/session-watcher", () => ({ SessionWatcher: () => null }));

import OrganizationsPage from "./page";

describe("Organizations page", () => {
  it("shows the page title", () => {
    render(<OrganizationsPage />);
    expect(screen.getByRole("heading", { name: "Organizations" })).toBeInTheDocument();
  });
});
