summary: |
  Carry the `traveller` and `admin` roles from the Auth0 access token into the Application API and the Web App, and enforce them. The API validates the bearer JWT against the identity provider's keys, builds a `Principal` whose roles always include `traveller` (every account is a traveller, admin is added on top), and exposes `require_role(...)` FastAPI dependencies that answer 401 for a missing or invalid token and 403 for a missing role, so admin actions are refused server-side even when the interface is bypassed. The Web App keeps the roles from sign-in in a session snapshot and shows admin-only areas only through an `AdminOnly` gate. Because roles are read only from the token and the session issued at sign-in, a role removed at the identity provider takes effect on the next sign-in (AC7, AC8). The admin screens themselves and the sign-in flow are out of scope.
scope:
  - description: |
      API settings for token validation. Add to `Settings`: `auth_issuer: str = ""`, `auth_audience: str = ""`, `auth_jwks_url: str = ""`, `auth_roles_claim: str = "https://travel.example/roles"` (Auth0 requires a namespaced custom claim). Empty issuer, audience or JWKS URL means every protected request is refused with 401 (fail closed).
    files:
      - services/api/app/config.py
    rationale: |
      ADR-0005: the API only validates tokens issued by Auth0, so it needs the issuer, audience and key location. The roles claim name is configurable because the Auth0 Action that writes it is set up outside this repository.
  - description: |
      Auth module with the `Role` type, the `Principal` and the dependencies.

      ```python
      Role = Literal["traveller", "admin"]

      @dataclass(frozen=True)
      class Principal:
          subject: str
          roles: frozenset[Role]   # always contains "traveller"

      def get_signing_key_resolver() -> Callable[[str], Any]: ...   # overridable in tests; PyJWKClient(settings.auth_jwks_url).get_signing_key_from_jwt in production
      def get_principal(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)), resolver=Depends(get_signing_key_resolver)) -> Principal: ...
      def require_role(role: Role) -> Callable[..., Principal]: ...   # raises HTTPException(403) when role not in principal.roles
      ```

      `get_principal` decodes with RS256 only, verifies `exp`, `iss` and `aud`, raises 401 with `WWW-Authenticate: Bearer` on a missing, malformed, expired or wrongly issued token, reads the roles claim, drops unknown role names, and always adds `traveller`. Roles are read only from the token, never from a database or cache, so a removal at the identity provider shows on the next token issued at sign-in.
    files:
      - services/api/app/auth.py
    rationale: |
      ADR-0007 (every request is authenticated by a JWT and authorised by role) and ADR-0002 (the API enforces role checks on admin operations). A single `require_role` dependency is the one choke point that every later admin route reuses.
  - description: |
      Add `PyJWT[crypto]` to the API dependencies for RS256 verification and JWKS lookup (`uv add "pyjwt[crypto]>=2.9"`). See `package_dependencies`.
    files:
      - services/api/pyproject.toml
    rationale: |
      The API has no JWT library today; the installed set (`fastapi`, `pydantic-settings`, `psycopg`) cannot verify signatures.
  - description: |
      Web role helpers, pure and framework-free.

      ```ts
      export type Role = "traveller" | "admin";
      export function rolesFromClaims(claims: Record<string, unknown>, claimName: string): Role[]; // always includes "traveller"; ignores unknown values and a non-array claim
      export function hasRole(roles: readonly Role[], role: Role): boolean;
      ```

      The claim name comes from `NEXT_PUBLIC_AUTH_ROLES_CLAIM` with the same default as the API.
    files:
      - apps/web/src/lib/roles.ts
    rationale: |
      Both the session builder (added by the sign-in story) and the gate need one definition of "who holds which role", mirroring the API.
  - description: |
      Role gate components: `RolesProvider` (takes the `roles` from the sign-in session and holds them for the session's life without refetching), `useRoles()`, and `AdminOnly` which renders `children` only when `hasRole(roles, "admin")` and renders nothing otherwise (no placeholder or link). `TravellerOnly` is not needed: every signed-in account holds `traveller`, so traveller screens use `hasRole(roles, "traveller")` through the same hook.
    files:
      - apps/web/src/components/role-gate.tsx
    rationale: |
      ADR-0001: admin screens ship in the same Web App and are shown only to admins. This is the single place later admin screens (App shell and admin epic) wrap themselves in. It is a presentation convenience only; the API remains the enforcement point (ADR-0002).
tests:
  - |
    AC1 and AC8, web. Failing test first in `apps/web/src/components/role-gate.test.tsx`:
    ```tsx
    render(<RolesProvider roles={["traveller"]}><AdminOnly><p>Admin area</p></AdminOnly></RolesProvider>);
    expect(screen.queryByText("Admin area")).not.toBeInTheDocument();
    ```
    Plus in `apps/web/src/lib/roles.test.ts`: `expect(rolesFromClaims({ [CLAIM]: [] }, CLAIM)).toEqual(["traveller"])`. AC8 is covered by a fresh `RolesProvider` built from claims that no longer hold admin showing nothing.
  - |
    AC2, web. Same file:
    ```tsx
    render(<RolesProvider roles={["traveller", "admin"]}><AdminOnly><p>Admin area</p></AdminOnly></RolesProvider>);
    expect(screen.getByText("Admin area")).toBeInTheDocument();
    ```
  - |
    AC3 and AC4, web and API. Web (`roles.test.ts`): `expect(hasRole(rolesFromClaims({ [CLAIM]: ["traveller"] }, CLAIM), "traveller")).toBe(true)` and the same with `["traveller", "admin"]`. A role-gate test renders a traveller screen under both role sets and expects it present. API (`services/api/tests/test_auth.py`): a token with roles `["traveller"]` and one with `["traveller", "admin"]` both get 200 from a test-only route guarded by `require_role("traveller")`. A token with no roles claim also gets 200 because every account is a traveller.
  - |
    AC5, API. In `test_auth.py`, build a test app that mounts a route `GET /_admin_probe` guarded by `Depends(require_role("admin"))`. Tokens are signed with an RSA key generated in the test, and `get_signing_key_resolver` is overridden to return the matching public key.
    ```python
    r = client.get("/_admin_probe", headers={"Authorization": f"Bearer {token(roles=['traveller'])}"})
    assert r.status_code == 403
    assert client.get("/_admin_probe").status_code == 401
    ```
    Also 401 for an expired token, wrong `iss`, wrong `aud`, a token signed with a different key, and an `alg: none` token.
  - |
    AC6, API. Same probe route:
    ```python
    r = client.get("/_admin_probe", headers={"Authorization": f"Bearer {token(roles=['traveller', 'admin'])}"})
    assert r.status_code == 200
    ```
  - |
    AC7, API and web. API: a still-valid token that carries `admin` keeps getting 200 from the probe, because roles come only from the token and no per-request lookup happens. The test asserts the resolver is called with the token only and no other store is touched. Web: rerender the same `RolesProvider roles={["traveller", "admin"]}` and assert `expect(screen.getByText("Admin area")).toBeInTheDocument()` still holds, with `fetch` stubbed and `expect(fetchMock).not.toHaveBeenCalled()`.
  - |
    AC8, API. A newly issued token for the same subject without `admin` (the state after signing in again) gets 403 from the probe:
    ```python
    assert client.get("/_admin_probe", headers=bearer(roles=["traveller"])).status_code == 403
    ```
  - |
    Fail-closed configuration, API. With `auth_issuer`, `auth_audience` and `auth_jwks_url` empty, a request with a well-formed bearer token gets 401, never 200.
  - |
    Narrow commands for the red then green cycle: `(cd services/api && uv run --no-sync --offline pytest tests/test_auth.py -q)` and `(cd apps/web && pnpm exec vitest run src/lib/roles.test.ts src/components/role-gate.test.tsx)`. The finished work must pass the full project test command.
assumptions_or_open_questions:
  - |
    The sign-in and sign-out flow (Auth0 login, session cookie) is not in the repository: `apps/web/src` holds only `app/layout.tsx`, `app/page.tsx`, `app/globals.css` and `components/hero.tsx`, and `services/api/app` holds only `config.py`, `main.py` and `routers/health.py`. This plan assumes the sign-in story provides the session and calls `RolesProvider` with roles from `rolesFromClaims`. If it merges first, wire the provider there; otherwise the provider is exercised only by tests.
  - |
    Auth0 provisioning outside this repository. The `traveller` and `admin` roles, the Auth0 Action that copies the user's roles into the namespaced claim on the access token (and ID token) and the API audience must exist before this works end to end. The claim name `https://travel.example/roles` is a placeholder and needs the real namespace.
  - |
    First admin account (open from TESTING-27-NOV-EPIC-008). Roles are assigned by existing admins, so the first admin has to be assigned directly in the Auth0 dashboard or by a bootstrap step. This plan does not create one, because the item says role assignment happens at the identity provider. A person should confirm that is acceptable.
  - |
    Server-side effect of AC7. The API accepts a token until it expires, so a removed admin role keeps working on the API for as long as their access token lives. Access token lifetime in Auth0 must be set short (suggested 15 minutes), but AC7 requires that the role not be re-checked mid-session. Confirm the lifetime.
  - |
    Account deletion, privacy rules for stored profile data and retention after deactivation (open from EPIC-008 and CHORE-018) do not touch role handling, because this plan stores nothing about the person. They stay open for the profile story.
  - |
    The admin action routes do not exist yet (they belong to the App shell and admin epic). AC5 and AC6 are therefore proven against a test-only probe route, and the first real admin route must use `require_role("admin")` and add its own 403 test.
decisions:
  - decision: Treat every validly authenticated account as a traveller and add admin on top of it.
    rationale: The item says every account is a traveller and admin is added on top, so the API does not depend on the identity provider carrying a `traveller` role value.
    alternatives:
      - Require the `traveller` value in the roles claim, which locks out accounts the identity provider has not tagged
    durable: true
    evidence:
      - services/api/app/auth.py Principal.roles always contains traveller
    scope: project-wide
    status: proposed
  - decision: Read roles only from the signed token claim, with no per-request lookup in the identity provider, database or cache.
    rationale: AC7 requires a role removal to show only after the next sign-in. It also keeps the API stateless, as ADR-0005 expects, and ADR-0004 forbids treating the cache as the only copy of data.
    alternatives:
      - Call the Auth0 Management API on each request, which would apply removals immediately but contradicts AC7
    durable: true
    evidence:
      - services/api/app/auth.py get_principal
    scope: api
    status: follows
    follows_adr:
      - ADR-0005
      - ADR-0007
  - decision: Enforce roles with a `require_role(role)` FastAPI dependency that returns 401 for an unauthenticated request and 403 for a missing role.
    rationale: One reusable enforcement point for all admin routes, and a distinct status for each failure.
    alternatives:
      - Per-route role checks inside handlers
      - A global middleware that guesses admin routes by path prefix
    durable: true
    evidence:
      - services/api/app/auth.py require_role
    scope: api
    status: follows
    follows_adr:
      - ADR-0002
      - ADR-0007
  - decision: Verify tokens with PyJWT using RS256 and the JWKS of the issuer, and fail closed when the issuer, audience or JWKS URL is unset.
    rationale: Auth0 signs with RS256 and publishes a JWKS. An unset configuration must never accept tokens.
    alternatives:
      - Hand-rolled verification with `cryptography`
      - python-jose, which has had a weaker maintenance record
    durable: true
    evidence:
      - services/api/pyproject.toml dependencies
    scope: api
    status: proposed
  - decision: Gate admin areas in the Web App with an `AdminOnly` component fed by a session roles snapshot, as a display convenience only.
    rationale: ADR-0001 requires admin screens to be shown only to admins, and the API remains the enforcement point.
    alternatives:
      - Next.js middleware route protection, deferred to the admin screens epic
    durable: true
    evidence:
      - apps/web/src/components/role-gate.tsx
    scope: web
    status: follows
    follows_adr:
      - ADR-0001
estimated_points: 5
package_dependencies:
  - name: pyjwt
    version: ">=2.9,<3"
    ecosystem: pip
    rationale: Verifies the RS256 signature, expiry, issuer and audience of the Auth0 access token and fetches signing keys from the JWKS (`PyJWKClient`). The `crypto` extra brings in `cryptography`, which RS256 needs.
    component_id: comp_application_api
notes: |
  ### Data & rollout

  - **Existing data**: None. No database schema, stored row, cache payload or migration changes; roles live only in the token and the session.
  - **Backfill / seed**: None. No seed is needed. The first admin is assigned in Auth0 (see open questions).
  - **Settings**: `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL` and `AUTH_ROLES_CLAIM` for the API (`services/api/app/config.py`, read through pydantic-settings), and `NEXT_PUBLIC_AUTH_ROLES_CLAIM` for the Web App. The first three default to empty, which refuses all protected requests (safe when unset). The claim name defaults to the placeholder namespace.
  - **Provisioning**: In Auth0, the `traveller` and `admin` roles, an Action that writes roles into the namespaced claim, and the API audience. This is done by a person, not by this change.
  - **Order and rollback**: Configure Auth0 first, then deploy the API, then the Web App. Nothing is stored, so rollback is a redeploy of the previous images. The API has no protected routes yet, so deploying `auth.py` changes no behaviour for existing routes (`/health` stays unauthenticated).

  ### Design system

  No visual UI is added: `AdminOnly` renders its children or nothing, so no tokens, icons or page templates are used. Admin screens and their loading, empty and error states belong to the App shell and admin epic. The existing `hero` component is untouched.

  ### Structure

  ```mermaid
  flowchart TD
    main[services/api/app/main.py] --> health[routers/health.py]
    main -. later admin routes .-> auth[services/api/app/auth.py]
    auth --> config[services/api/app/config.py]
    auth --> jwt[PyJWT, pyproject.toml]
    layout[apps/web/src/app/layout.tsx] -. later sign-in story .-> gate[components/role-gate.tsx]
    gate --> roles[apps/web/src/lib/roles.ts]
    classDef touched fill:#f96,color:#000
    class auth,config,jwt,gate,roles touched
  ```

  `main.py` and `layout.tsx` are not edited here. Wiring them is left to the first admin route and the sign-in story respectively.
review_focus: |
  IN scope: server-side role validation and enforcement in the API (`auth.py`, `require_role`) and a role gate plus claim parsing in the Web App. OUT of scope: the Auth0 sign-in flow, admin screens and routes, first-admin bootstrap, and the profile or retention questions. The riskiest part is token verification (algorithm, issuer, audience, expiry, fail-closed configuration), so check those tests closely. Reading roles only from the token, with no live lookup, is deliberate: it is what AC7 requires.
