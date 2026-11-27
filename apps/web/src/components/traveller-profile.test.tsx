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

  it("sign out discards the stored access token", async () => {
    sessionStorage.setItem("access_token", "fake-token");
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(sessionStorage.getItem("access_token")).toBeNull();
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

describe("TravellerProfile extra cases", () => {
  it("keeps edits and shows an error when the save fails", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockRejectedValue(new Error("down"));
    type(name, "Zed");
    fireEvent.click(save());
    expect(await screen.findByText(/could not be saved/)).toBeInTheDocument();
    expect(name).toHaveValue("Zed");
    expect(save()).toBeEnabled();
    expect(screen.queryByText("Your changes are saved.")).toBeNull();
  });

  it("disables Save and Cancel again after a successful save", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...base, name: "Zed" });
    type(name, "Zed");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(save()).toBeDisabled();
    expect(cancel()).toBeDisabled();
  });

  it("hides the success message when the traveller edits again", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...base, name: "Zed" });
    type(name, "Zed");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    type(name, "Zed2");
    expect(screen.queryByText("Your changes are saved.")).toBeNull();
  });

  it("disables Cancel while saving", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockReturnValue(new Promise(() => {}));
    type(name, "Zed");
    fireEvent.click(save());
    await screen.findByRole("button", { name: "Saving…" });
    expect(cancel()).toBeDisabled();
  });

  it("sends trimmed name and email", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockResolvedValue(base);
    type(name, "  Zed  ");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "Zed" }));
  });

  it("choosing No preference clears the value and sends null", async () => {
    await open();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...base, seat: null });
    type(screen.getByLabelText("Preferred seat"), "");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ seat: null }));
  });

  it("flags an invalid email with the inline message and marks the field invalid", async () => {
    await open();
    const email = screen.getByLabelText("Email");
    type(email, "not-an-email");
    fireEvent.click(save());
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/Enter a valid email address\./);
    expect(api.saveProfile).not.toHaveBeenCalled();
  });

  it("clears inline errors on Cancel", async () => {
    const name = await open();
    type(name, "");
    fireEvent.click(save());
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    fireEvent.click(cancel());
    expect(screen.queryByText("Enter your name.")).toBeNull();
  });

  it("restores the other fields on Cancel too", async () => {
    await open();
    type(screen.getByLabelText("Email"), "other@example.com");
    type(screen.getByLabelText("Dietary needs"), "Vegan");
    fireEvent.click(cancel());
    expect(screen.getByLabelText("Email")).toHaveValue("amara.okafor@example.com");
    expect(screen.getByLabelText("Dietary needs")).toHaveValue("");
  });

  it("Add preferences form keeps the personal details card", async () => {
    await open(empty);
    fireEvent.click(screen.getByRole("button", { name: "Add preferences" }));
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Preferred cabin")).toBeInTheDocument();
  });

  it("does not show Save as enabled right after opening Add preferences", async () => {
    await open(empty);
    fireEvent.click(screen.getByRole("button", { name: "Add preferences" }));
    expect(save()).toBeDisabled();
  });

  it("shows a single role badge for a traveller with one role", async () => {
    await open();
    const group = screen.getByRole("group", { name: "Your roles" });
    expect(within(group).getAllByText(/Traveller|Admin/)).toHaveLength(1);
  });

  it("shows the loading skeleton before the profile arrives", () => {
    vi.mocked(api.fetchProfile).mockReturnValue(new Promise(() => {}));
    render(<TravellerProfile />);
    expect(screen.getByLabelText("Loading your profile")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("shows the error again when Try again fails again", async () => {
    vi.mocked(api.fetchProfile).mockRejectedValue(new Error("x"));
    render(<TravellerProfile />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(api.fetchProfile).toHaveBeenCalledTimes(2);
  });

  it("does not offer sign out in the load error state's form fields", async () => {
    vi.mocked(api.fetchProfile).mockRejectedValue(new Error("x"));
    render(<TravellerProfile />);
    await screen.findByRole("alert");
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("does not navigate when saving", async () => {
    const name = await open();
    vi.mocked(api.saveProfile).mockResolvedValue({ ...base, name: "Zed" });
    type(name, "Zed");
    fireEvent.click(save());
    await screen.findByText("Your changes are saved.");
    expect(push).not.toHaveBeenCalled();
  });
});
