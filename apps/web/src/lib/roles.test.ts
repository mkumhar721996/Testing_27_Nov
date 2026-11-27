import { hasRole, rolesFromClaims } from "./roles";

const CLAIM = "https://travel.example/roles";

describe("rolesFromClaims", () => {
  it("gives every account the traveller role", () => {
    expect(rolesFromClaims({ [CLAIM]: [] }, CLAIM)).toEqual(["traveller"]);
    expect(rolesFromClaims({}, CLAIM)).toEqual(["traveller"]);
  });

  it("adds admin on top of traveller", () => {
    expect(rolesFromClaims({ [CLAIM]: ["admin"] }, CLAIM)).toEqual(["traveller", "admin"]);
    expect(rolesFromClaims({ [CLAIM]: ["traveller", "admin"] }, CLAIM)).toEqual([
      "traveller",
      "admin",
    ]);
  });

  it("ignores unknown values and a non-array claim", () => {
    expect(rolesFromClaims({ [CLAIM]: ["root", 3] }, CLAIM)).toEqual(["traveller"]);
    expect(rolesFromClaims({ [CLAIM]: "admin" }, CLAIM)).toEqual(["traveller"]);
  });
});

describe("hasRole", () => {
  it("is true for traveller with either role set", () => {
    expect(hasRole(rolesFromClaims({ [CLAIM]: ["traveller"] }, CLAIM), "traveller")).toBe(true);
    expect(hasRole(rolesFromClaims({ [CLAIM]: ["traveller", "admin"] }, CLAIM), "traveller")).toBe(
      true,
    );
  });

  it("is false for admin without the admin role", () => {
    expect(hasRole(rolesFromClaims({ [CLAIM]: ["traveller"] }, CLAIM), "admin")).toBe(false);
  });
});
