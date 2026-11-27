import { vi } from "vitest";
import { fetchProfile, validateDraft, SEAT_OPTIONS } from "./profile-api";

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
