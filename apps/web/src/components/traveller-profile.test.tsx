import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { TravellerProfile } from "./traveller-profile";
import * as api from "@/lib/profile-api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/profile-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/profile-api")>()),
  fetchProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

const base: api.Profile = {
  name: "Amara Okafor",
  email: "amara.okafor@example.com",
  seat: "Window",
  cabin: null,
  diet: null,
  roles: ["Traveller"],
};
const empty = { ...base, seat: null };

beforeEach(() => {
  vi.resetAllMocks();
});

async function open(p: api.Profile = base) {
  vi.mocked(api.fetchProfile).mockResolvedValue(p);
  render(<TravellerProfile />);
  return screen.findByLabelText("Full name");
}
const save = () => screen.getByRole("button", { name: /^Save changes$|^Saving…$/ });
const cancel = () => screen.getByRole("button", { name: "Cancel" });
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

describe("TravellerProfile", () => {
  it("AC1 shows name and email", async () => {
    expect(await open()).toHaveValue("Amara Okafor");
    expect(screen.getByLabelText("Email")).toHaveValue("amara.okafor@example.com");
  });

  it("AC2/AC3/AC24/AC25 blank fields show inline errors and do not save", async () => {
    const name = await open();
    type(name, "");
    type(screen.getByLabelText("Email"), "");
    fireEvent.click(save());
    expect(api.saveProfile).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(name).toHaveAccessibleDescription(/Enter your name\./);
    fireEvent.click(cancel());
    expect(name).toHaveValue("Amara Okafor");
  });

  it("AC4/AC12 saves with empty preferences and stays on page", async () => {
    const name = await open(empty);
    vi.mocked(api.saveProfile).mockResolvedValue({ ...empty, name: "Amara O" });
    type(name, "Amara O");
    fireEvent.click(save());
    expect(await screen.findByText("Your changes are saved.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your traveller profile" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("AC5 new preference value is sent and shown", async () => {
    await open();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...base, cabin: "Business" });
    type(screen.getByLabelText("Preferred cabin"), "Business");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ cabin: "Business" }));
    expect(screen.getByLabelText("Preferred cabin")).toHaveValue("Business");
  });

  it("AC6/AC7 role badge lists all roles with no controls", async () => {
    await open({ ...base, roles: ["Traveller", "Admin"] });
    const group = screen.getByRole("group", { name: "Your roles" });
    expect(within(group).getByText("Traveller")).toBeInTheDocument();
    expect(within(group).getByText("Admin")).toBeInTheDocument();
    for (const role of ["button", "combobox", "textbox", "link"]) {
      expect(within(group).queryAllByRole(role)).toHaveLength(0);
    }
  });

  it("AC8 shows the empty-preferences prompt", async () => {
    await open(empty);
    expect(screen.getByRole("button", { name: "Add preferences" })).toBeInTheDocument();
  });

  it.each([["seat"], ["cabin"], ["diet"]])("AC9 hides the prompt when %s is set", async (k) => {
    await open({ ...empty, [k]: k === "seat" ? "Aisle" : k === "cabin" ? "First" : "Vegan" });
    expect(screen.queryByRole("button", { name: "Add preferences" })).not.toBeInTheDocument();
  });

  it("AC10/AC11 Add preferences reveals the inline form and saves", async () => {
    await open(empty);
    fireEvent.click(screen.getByRole("button", { name: "Add preferences" }));
    expect(screen.queryByRole("button", { name: "Add preferences" })).not.toBeInTheDocument();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...empty, diet: "Vegan" });
    type(screen.getByLabelText("Dietary needs"), "Vegan");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ diet: "Vegan" }));
  });

  it("AC13 Cancel restores saved values", async () => {
    const name = await open();
    type(name, "Zed");
    type(screen.getByLabelText("Preferred cabin"), "First");
    fireEvent.click(cancel());
    expect(name).toHaveValue("Amara Okafor");
    expect(screen.getByLabelText("Preferred cabin")).toHaveValue("");
  });

  it("AC14-16 load error with Try again", async () => {
    vi.mocked(api.fetchProfile).mockRejectedValueOnce(new Error("x")).mockResolvedValue(base);
    render(<TravellerProfile />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your profile could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Full name")).toHaveValue("Amara Okafor");
    expect(screen.getByLabelText("Email")).toHaveValue("amara.okafor@example.com");
  });

  it("AC17 has no home airport or currency", async () => {
    await open();
    expect(screen.queryByLabelText(/home airport|currency/i)).toBeNull();
  });

  it("AC18/AC19 buttons follow dirty state", async () => {
    const name = await open();
    expect(save()).toBeDisabled();
    expect(cancel()).toBeDisabled();
    type(name, "Amara Okafor x");
    expect(save()).toBeEnabled();
    expect(cancel()).toBeEnabled();
  });

  it("AC20/AC21 shows Saving… and disables while saving", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockReturnValue(new Promise(() => {}));
    type(name, "Amara Okafor x");
    fireEvent.click(save());
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("AC22/AC23 sign out goes to the Sign in screen", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(push).toHaveBeenCalledWith("/sign-in");
  });

  it("AC26 preferences are pick-lists", async () => {
    await open();
    for (const l of ["Preferred seat", "Preferred cabin", "Dietary needs"]) {
      expect(screen.getByLabelText(l).tagName).toBe("SELECT");
    }
    const opts = within(screen.getByLabelText("Preferred seat")).getAllByRole("option");
    expect(opts.map((o) => o.textContent)).toEqual(["No preference", ...api.SEAT_OPTIONS]);
  });
});
