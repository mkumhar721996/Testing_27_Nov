import { vi } from "vitest";
import {
  CABIN_OPTIONS,
  DIET_OPTIONS,
  fetchProfile,
  saveProfile,
  validateDraft,
  SEAT_OPTIONS,
} from "./profile-api";

const draft = { name: "Amara", email: "a@b.co", seat: null, cabin: null, diet: null };

describe("validateDraft", () => {
  it("requires a name", () => {
    expect(validateDraft({ ...draft, name: "  " }).name).toBe("Enter your name.");
  });
  it("requires a valid email", () => {
    expect(validateDraft({ ...draft, email: "" }).email).toBeTruthy();
    expect(validateDraft({ ...draft, email: "not-an-email" }).email).toBeTruthy();
    expect(validateDraft(draft).email).toBeUndefined();
  });
  it("exposes fixed seat options", () => {
    expect([...SEAT_OPTIONS]).toEqual(["Window", "Aisle", "Middle"]);
  });
});

describe("request auth", () => {
  it("sends the access token as a Bearer header", async () => {
    sessionStorage.setItem("access_token", "fake-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchProfile();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer fake-token");
    vi.unstubAllGlobals();
  });
});

describe("validateDraft edge cases", () => {
  it.each(["a@b", "@b.co", "a b@c.co", "a@@b.co", "   "])("rejects email %j", (email) => {
    expect(validateDraft({ ...draft, email }).email).toBe("Enter a valid email address.");
  });
  it("trims surrounding spaces before validating", () => {
    expect(validateDraft({ ...draft, name: " A ", email: " a@b.co " })).toEqual({});
  });
  it("reports both errors together", () => {
    expect(validateDraft({ ...draft, name: "", email: "" })).toEqual({
      name: "Enter your name.",
      email: "Enter a valid email address.",
    });
  });
  it("exposes fixed cabin and dietary options", () => {
    expect([...CABIN_OPTIONS]).toEqual(["Economy", "Premium economy", "Business", "First"]);
    expect(DIET_OPTIONS).toHaveLength(6);
  });
});

describe("request errors", () => {
  it("throws on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(fetchProfile()).rejects.toThrow();
    vi.unstubAllGlobals();
  });
  it("sends the draft as JSON with PUT", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await saveProfile(draft);
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(draft);
    vi.unstubAllGlobals();
  });
});
