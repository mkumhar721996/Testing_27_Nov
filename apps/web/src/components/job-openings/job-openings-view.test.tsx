import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/job-openings";
import type { JobOpening } from "@/lib/api/job-openings";
import { JobOpeningsView } from "./job-openings-view";

vi.mock("@/lib/api/job-openings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/job-openings")>()),
  listJobOpenings: vi.fn(),
  createJobOpening: vi.fn(),
  updateJobOpening: vi.fn(),
  openJobOpening: vi.fn(),
  closeJobOpening: vi.fn(),
}));

const mocked = vi.mocked(api);

function opening(over: Partial<JobOpening>): JobOpening {
  return {
    id: 1,
    reference: "JO-1",
    title: "Payroll specialist",
    department: "Finance",
    location: "Berlin",
    employment_type: "Full time",
    description: "Run payroll.",
    status: "open",
    candidate_count: 0,
    in_progress_count: 0,
    ...over,
  };
}

// Minimal stand-in for user-event, which is not installed.
const userEvent = {
  setup: () => ({
    click: async (el: HTMLElement) => void fireEvent.click(el),
    type: async (el: HTMLElement, text: string) =>
      void fireEvent.change(el, { target: { value: (el as HTMLInputElement).value + text } }),
    clear: async (el: HTMLElement) => void fireEvent.change(el, { target: { value: "" } }),
    selectOptions: async (el: HTMLElement, value: string) =>
      void fireEvent.change(el, { target: { value } }),
  }),
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

async function fillValid(user: ReturnType<typeof userEvent.setup>, title = "Payroll specialist") {
  await user.type(screen.getByLabelText("Job title"), title);
  await user.type(screen.getByLabelText("Department"), "Finance");
  await user.type(screen.getByLabelText("Location"), "Berlin");
  await user.selectOptions(screen.getByLabelText("Employment type"), "Full time");
}

describe("states", () => {
  it("shows a loading status while pending", () => {
    mocked.listJobOpenings.mockReturnValue(new Promise(() => {}));
    render(<JobOpeningsView />);
    expect(screen.getByRole("status", { name: "Loading job openings" })).toBeInTheDocument();
  });

  it("shows the empty state with one create action", async () => {
    mocked.listJobOpenings.mockResolvedValue([]);
    render(<JobOpeningsView />);
    expect(await screen.findByText("No job openings yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create opening" })).toHaveLength(1);
  });

  it("shows an error and retries", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockRejectedValueOnce(new Error("network"));
    mocked.listJobOpenings.mockResolvedValueOnce([opening({})]);
    render(<JobOpeningsView />);
    expect(await screen.findByText("Job openings could not be loaded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Payroll specialist")).toBeInTheDocument();
  });

  it("shows the forbidden state and no table for a non HR admin (AC9)", async () => {
    mocked.listJobOpenings.mockRejectedValue(new api.ForbiddenError());
    render(<JobOpeningsView />);
    expect(
      await screen.findByRole("heading", { name: "Job openings are for HR admins" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("list", () => {
  it("shows the total count and split (AC6)", async () => {
    mocked.listJobOpenings.mockResolvedValue([
      opening({ candidate_count: 4, in_progress_count: 1 }),
    ]);
    render(<JobOpeningsView />);
    const row = (await screen.findByText("Payroll specialist")).closest("tr")!;
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("1 in progress, 3 finished")).toBeInTheDocument();
  });

  it("shows zero candidates (AC7)", async () => {
    mocked.listJobOpenings.mockResolvedValue([opening({})]);
    render(<JobOpeningsView />);
    const row = (await screen.findByText("Payroll specialist")).closest("tr")!;
    expect(within(row).getByText("0")).toBeInTheDocument();
    expect(within(row).getByText("No candidates yet")).toBeInTheDocument();
  });
});

describe("create and edit", () => {
  it("creates an opening that appears as Open (AC1, AC11)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([]);
    mocked.createJobOpening.mockResolvedValue(opening({ id: 2, reference: "JO-2" }));
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Create opening" }));
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save opening" }));
    const row = (await screen.findByText("Payroll specialist")).closest("tr")!;
    expect(within(row).getByText("Open")).toBeInTheDocument();
    expect(mocked.createJobOpening).toHaveBeenCalledOnce();
  });

  it.each([
    ["Job title", "Enter a job title."],
    ["Department", "Enter a department."],
    ["Location", 'Enter a location, or "Remote".'],
    ["Employment type", "Choose an employment type."],
  ])("refuses an empty %s and shows its error beside it (AC10)", async (label, message) => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([]);
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Create opening" }));
    await fillValid(user);
    const field = screen.getByLabelText(label);
    if (label === "Employment type") await user.selectOptions(field, "");
    else await user.clear(field);
    await user.click(screen.getByRole("button", { name: "Save opening" }));
    expect(screen.getByText(message)).toBeVisible();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(mocked.createJobOpening).not.toHaveBeenCalled();
  });

  it("shows server field messages beside the field", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([]);
    mocked.createJobOpening.mockRejectedValue(
      new api.ValidationError({ title: "Enter a job title." }),
    );
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Create opening" }));
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save opening" }));
    expect(await screen.findByText("Enter a job title.")).toBeVisible();
    expect(screen.getByLabelText("Job title")).toHaveAttribute("aria-invalid", "true");
  });

  it("edits details and shows them in the row (AC2)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([opening({})]);
    mocked.updateJobOpening.mockResolvedValue(opening({ location: "Munich" }));
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Edit Payroll specialist" }));
    expect(screen.getByRole("heading", { name: "Edit opening" })).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toHaveValue("Berlin");
    await user.clear(screen.getByLabelText("Location"));
    await user.type(screen.getByLabelText("Location"), "Munich");
    await user.click(screen.getByRole("button", { name: "Save opening" }));
    expect(await screen.findByText("Munich")).toBeInTheDocument();
  });
});

describe("open and close", () => {
  it("opens a closed opening (AC3)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([
      opening({ title: "Benefits analyst", status: "closed" }),
    ]);
    mocked.openJobOpening.mockResolvedValue(opening({ title: "Benefits analyst" }));
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Open Benefits analyst" }));
    const row = (await screen.findByText("Benefits analyst")).closest("tr")!;
    expect(await within(row).findByText("Open")).toBeInTheDocument();
  });

  it("closes after confirmation (AC4)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([opening({ candidate_count: 2 })]);
    mocked.closeJobOpening.mockResolvedValue(opening({ status: "closed", candidate_count: 2 }));
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Close Payroll specialist" }));
    expect(screen.getByRole("heading", { name: "Close this opening?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close opening" }));
    const row = (await screen.findByText("Payroll specialist")).closest("tr")!;
    expect(await within(row).findByText("Closed")).toBeInTheDocument();
  });

  it("explains a close with no candidates (AC12)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([opening({})]);
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Close Payroll specialist" }));
    expect(
      screen.getByText("It has no candidates. You can open it again later."),
    ).toBeInTheDocument();
  });

  it("refuses a close the API refuses and keeps it open (AC5)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([opening({ candidate_count: 1 })]);
    mocked.closeJobOpening.mockRejectedValue(new api.CloseRefusedError(1));
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Close Payroll specialist" }));
    await user.click(screen.getByRole("button", { name: "Close opening" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("stays open");
    const row = screen.getByText("Payroll specialist", { selector: ".font-medium" }).closest("tr")!;
    expect(within(row).getByText("Open")).toBeInTheDocument();
  });

  it("refuses a close up front when candidates are in progress (AC5)", async () => {
    const user = userEvent.setup();
    mocked.listJobOpenings.mockResolvedValue([
      opening({ candidate_count: 3, in_progress_count: 2 }),
    ]);
    render(<JobOpeningsView />);
    await user.click(await screen.findByRole("button", { name: "Close Payroll specialist" }));
    expect(screen.getByRole("alert")).toHaveTextContent("stays open");
    expect(screen.queryByRole("heading", { name: "Close this opening?" })).not.toBeInTheDocument();
    expect(mocked.closeJobOpening).not.toHaveBeenCalled();
  });
});
