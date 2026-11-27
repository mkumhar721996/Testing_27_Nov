import { validateDraft, SEAT_OPTIONS } from "./profile-api";

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
