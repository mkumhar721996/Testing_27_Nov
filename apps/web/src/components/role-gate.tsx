"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { hasRole, type Role } from "@/lib/roles";

const RolesContext = createContext<readonly Role[]>([]);

// Holds the roles from sign-in for the session's life; they are never refetched.
// A presentation convenience only: the API enforces roles.
export function RolesProvider({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const [snapshot] = useState(roles);
  return <RolesContext.Provider value={snapshot}>{children}</RolesContext.Provider>;
}

export function useRoles(): readonly Role[] {
  return useContext(RolesContext);
}

export function AdminOnly({ children }: { children: ReactNode }) {
  return hasRole(useRoles(), "admin") ? <>{children}</> : null;
}
