export type Role = "traveller" | "admin";

export const DEFAULT_ROLES_CLAIM = "https://travel.example/roles";
export const ROLES_CLAIM = process.env.NEXT_PUBLIC_AUTH_ROLES_CLAIM || DEFAULT_ROLES_CLAIM;

const KNOWN_ROLES: readonly Role[] = ["traveller", "admin"];

// Every account is a traveller; admin is added on top when the claim holds it.
export function rolesFromClaims(claims: Record<string, unknown>, claimName: string): Role[] {
  const claimed = claims[claimName];
  const values = Array.isArray(claimed) ? claimed : [];
  return KNOWN_ROLES.filter((role) => role === "traveller" || values.includes(role));
}

export function hasRole(roles: readonly Role[], role: Role): boolean {
  return roles.includes(role);
}
