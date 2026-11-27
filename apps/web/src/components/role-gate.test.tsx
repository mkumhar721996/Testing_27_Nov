import { render, screen } from "@testing-library/react";
import { AdminOnly, RolesProvider, useRoles } from "./role-gate";
import { hasRole, rolesFromClaims } from "@/lib/roles";

const CLAIM = "https://travel.example/roles";

function adminArea(roles: Parameters<typeof RolesProvider>[0]["roles"]) {
  return (
    <RolesProvider roles={roles}>
      <AdminOnly>
        <p>Admin area</p>
      </AdminOnly>
    </RolesProvider>
  );
}

function TravellerScreen() {
  return hasRole(useRoles(), "traveller") ? <p>Traveller screen</p> : null;
}

describe("AdminOnly", () => {
  it("shows nothing to a traveller without admin", () => {
    const { container } = render(adminArea(["traveller"]));
    expect(screen.queryByText("Admin area")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the admin area to an admin", () => {
    render(adminArea(["traveller", "admin"]));
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });

  it("shows nothing after signing in again without admin", () => {
    render(adminArea(rolesFromClaims({ [CLAIM]: [] }, CLAIM)));
    expect(screen.queryByText("Admin area")).not.toBeInTheDocument();
  });

  it("keeps showing the admin area on rerender without refetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(adminArea(["traveller", "admin"]));
    rerender(adminArea(["traveller", "admin"]));
    expect(screen.getByText("Admin area")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("traveller screens", () => {
  it.each([[["traveller"]], [["traveller", "admin"]]] as const)("show for %j", (roles) => {
    render(
      <RolesProvider roles={[...roles]}>
        <TravellerScreen />
      </RolesProvider>,
    );
    expect(screen.getByText("Traveller screen")).toBeInTheDocument();
  });
});
