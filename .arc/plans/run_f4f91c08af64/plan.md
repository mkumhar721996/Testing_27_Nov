summary: |
  Add sign-in through Auth0 (ADR-0005) to the Next.js Web App and land the user on a minimal Organizations screen. The Sign in screen follows the approved prototype: one centred card with the Sign in button; after a failed sign-in an inline danger alert with a 'Try again' button (which restores the button and removes the alert); an info alert 'Your session ended. Sign in again to continue.' and a success alert 'You signed out.' as the other two arrival states. The Organizations screen here is only the landing shell with a top bar user menu holding Sign out; the list, row menu, detail panel and scoping belong to the next story. Session expiry is handled on navigation (middleware) and while a screen is open (a watcher that probes a session route and redirects on 401), both landing on Sign in with the 'session ended' message. The Application API gains JWT validation (ADR-0007) and a small authenticated `GET /me` endpoint that the watcher's session probe calls, which also validates one of the four roles.
scope:
  - description: |
      Load the design tokens and component stylesheet once, in the app's entry stylesheet, and stop hard-coding slate/white colours in the root layout.
      `apps/web/src/app/globals.css` currently holds only `@import "tailwindcss";` (line 1) and is imported by `apps/web/src/app/layout.tsx` (line 3). Add, after the tailwind import:
      `@import "../../design/tokens.css";` and `@import "../../design/prototype-utils.css";` (defines `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-lg`, `.card`, `.stack`, `.alert`, `.alert-info`, `.alert-success`, `.alert-danger`, `.field-error`). In `layout.tsx` replace the body classes `bg-white text-slate-900` with a style using `var(--color-bg)`, `var(--color-fg)` and `var(--font-family-body)`.
      Copy `apps/web/design/icons.svg` to `apps/web/public/icons.svg` so `<use href="/icons.svg#i-clock"/>` resolves (glyphs used: `clock`, `check`, `flag`, `user`).
    files:
      - apps/web/src/app/globals.css
      - apps/web/src/app/layout.tsx
      - apps/web/public/icons.svg
    rationale: |
      The app does not load the tokens today (globals.css is tailwind only); every UI step below styles with tokens only.
  - description: |
      Application API: validate Auth0 JWTs and expose the signed-in user.
      New `app/auth.py` with `ROLES = ("wfc_admin", "fundraising_consultant", "org_admin", "org_staff")`, `class CurrentUser(BaseModel): sub: str; role: str`, and
      `def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))) -> CurrentUser` which verifies signature (RS256 via PyJWT `PyJWKClient` on `https://{auth0_domain}/.well-known/jwks.json`), `iss`, `aud` and `exp`; missing/invalid/expired token raises 401 with `WWW-Authenticate: Bearer`; a valid token whose roles claim holds none of the four roles raises 403. New `app/routers/me.py` with `GET /me` returning `{"sub": ..., "role": ...}` using that dependency. Register in `app/main.py` (`app.include_router(me.router)`). Extend `Settings` in `app/config.py` with `auth0_domain: str = ""`, `auth0_audience: str = ""`, `auth0_roles_claim: str = "https://bnts.example/roles"`. `/health` stays unauthenticated.
    files:
      - services/api/app/auth.py
      - services/api/app/routers/me.py
      - services/api/app/main.py
      - services/api/app/config.py
      - services/api/pyproject.toml
      - services/api/uv.lock
    rationale: |
      ADR-0005: the API only validates tokens. ADR-0007: every API request but the health probe is authenticated. A 401 from `/me` is the signal the Web App turns into the 'session ended' message.
  - description: |
      Web App auth plumbing with `@auth0/nextjs-auth0` v4 (Auth0 does the sign-in, ADR-0005).
      `src/lib/auth0.ts`: `export const auth0 = new Auth0Client({ session: { rolling: true, inactivityDuration: <env>, absoluteDuration: <env> }, authorizationParameters: { audience: process.env.AUTH0_AUDIENCE }, onCallback })`. `onCallback` redirects to `/organizations` on success (and sets a plain `bnts_signed_in=1` marker cookie, max-age = absolute duration, so a later request with no valid session can be told apart from a visitor who never signed in) and to `/signin?error=signin-failed` when the SDK reports an error.
      `src/lib/session-guard.ts`: pure `resolveAccess(input: { pathname: string; hasSession: boolean; hasMarker: boolean }): { action: "allow" } | { action: "redirect"; to: "/signin" | "/signin?reason=session-ended"; clearMarker: boolean }`. Public paths: `/signin`, `/auth/*`. Any other path without a session redirects; with the marker the target carries `reason=session-ended`.
      `src/middleware.ts`: runs `auth0.middleware(request)` for `/auth/*` routes and session refresh, then applies `resolveAccess`; matcher excludes `_next`, `icons.svg`, favicon.
      Sign-out: the SDK's `/auth/logout?returnTo=/signin%3Freason%3Dsigned-out` (the returnTo URL must be in Auth0's Allowed Logout URLs); the logout link also clears the marker cookie via the middleware.
      `src/app/api/session/route.ts`: `GET` gets the access token with `auth0.getAccessToken()`, calls the Application API `GET {API_BASE_URL}/me` with `Authorization: Bearer`, and returns 200 with the body, or 401 when there is no session, the token cannot be obtained, or the API answers 401. This is how Web App reads go through the API (ADR-0002).
    files:
      - apps/web/src/lib/auth0.ts
      - apps/web/src/lib/session-guard.ts
      - apps/web/src/middleware.ts
      - apps/web/src/app/api/session/route.ts
      - apps/web/package.json
      - apps/web/pnpm-lock.yaml
    rationale: |
      Covers AC1 (callback to Organizations), AC3 (sign-out target) and AC4 (next action with an expired session returns to Sign in with the message).
  - description: |
      Sign in screen, from the prototype screen 'Sign in' (data-layout="form", no app shell). Page template: form, one `.card.stack` centred in `.signin-main`, under a slim brand bar.
      `src/app/signin/page.tsx` (server component) reads `searchParams` (`reason`: `session-ended` | `signed-out`; `error`: `signin-failed`), redirects to `/organizations` when a session already exists, and renders `<SignInPanel initial="default" | "session-ended" | "signed-out" | "error" />`.
      `src/components/sign-in-panel.tsx` (client): `export type SignInState = "default" | "session-ended" | "signed-out" | "error"`; props `{ initial: SignInState }`. Content copied from the prototype: brand bar with the mark 'O' and 'Organization'; `h1` 'Sign in'; intro 'Sign in with your account to see the organizations you manage.'; the note 'You will sign in through your identity provider.'; default/session-ended/signed-out show the `.btn.btn-primary.btn-lg` 'Sign in' button (on click: disabled, label 'Signing in…', then `window.location.assign("/auth/login?returnTo=/organizations")`); session-ended adds `.alert.alert-info role="status"` with the `clock` icon and 'Your session ended. Sign in again to continue.'; signed-out adds `.alert.alert-success role="status"` with the `check` icon and 'You signed out.'; error shows `.alert.alert-danger role="alert"` with the `flag` icon and 'Sign-in failed. We couldn't sign you in, so nothing was changed. Try again.' plus a `.btn.btn-secondary.btn-lg` 'Try again' INSTEAD of the Sign in button. 'Try again' sets state to `default` (button back, alert gone) and `router.replace("/signin")` to drop the query. Icons are decorative (`aria-hidden`), via a small `Icon` helper that draws `<svg class="icon"><use href="/icons.svg#i-NAME"/></svg>` sized with `--icon-size-md`.
      Styles the prototype defines inline (`.signin-page`, `.signin-bar`, `.signin-logo`, `.signin-mark`, `.signin-main`, `.signin-card`, `.signin-note`, prototype lines 1279-1288) are not in the design folder, so add them to `globals.css` verbatim; they use only tokens (`--color-bg`, `--color-surface`, `--color-border`, `--header-height`, `--page-gutter`, `--space-1/7/9`, `--font-size-sm/lg/3xl`, `--container-sm`, `--control-height-sm`, `--radius-control`, `--color-primary`, `--color-on-primary`, `--color-fg-muted`, `--color-fg-faint`). Light and dark both work because only tokens are used; 'Try again' and 'Sign in' take focus visibly via the design's `:focus-visible` rule.
      States: this screen has no data load, so loading is the pending button label; empty is not applicable; error is the inline alert.
    files:
      - apps/web/src/app/signin/page.tsx
      - apps/web/src/components/sign-in-panel.tsx
      - apps/web/src/components/icon.tsx
      - apps/web/src/app/globals.css
    rationale: |
      AC1, AC2, AC6, AC7 (and the arrival states for AC3 to AC5).
  - description: |
      Organizations landing shell and the top bar menu. The list, row '...' menu, detail panel and their data are the NEXT story: this scope adds only the screen route, its page title and a placeholder body, so sign-in has somewhere to land.
      `src/app/organizations/page.tsx`: page template from the layout kit inside a header + content frame; `.page` / `.page-header` with the title 'Organizations' (matches the navigation label), body is an `.empty-state`-styled placeholder 'Your organizations will appear here.' replaced by the next story.
      `src/components/top-bar.tsx` and `src/components/top-bar-menu.tsx` (client): header bar using `--header-height`, `--page-gutter`, `--color-surface`, `--color-border`; a user menu button (`.btn.btn-ghost`, `user` icon plus visible label 'Account', `aria-haspopup="menu"`, `aria-expanded`) opening a popup with one item 'Sign out', an anchor to `/auth/logout?returnTo=/signin%3Freason%3Dsigned-out`. Esc and outside click close it, ArrowDown/Up moves focus, as in the prototype kit's menu behaviour (prototype lines 74-105).
      `src/components/session-watcher.tsx` (client, mounted by the Organizations page via the top bar so it also covers an open detail panel the next story adds): `useEffect` calls `fetch("/api/session")` every `SESSION_POLL_MS` (60000) and on `visibilitychange` to visible; on status 401 calls `window.location.assign("/signin?reason=session-ended")`; other failures (network, 5xx) are ignored so a blip does not sign the user out. Exports `apiFetch(input, init)` that does the same redirect on any 401, for the next story's list and detail calls.
      `src/app/page.tsx` becomes `redirect("/organizations")` (middleware sends signed-out users to Sign in); `e2e/home.spec.ts` is updated to match.
    files:
      - apps/web/src/app/organizations/page.tsx
      - apps/web/src/components/top-bar.tsx
      - apps/web/src/components/top-bar-menu.tsx
      - apps/web/src/components/session-watcher.tsx
      - apps/web/src/app/page.tsx
      - apps/web/e2e/home.spec.ts
    rationale: |
      AC1 (screen shown after sign in), AC3 (Sign out from the top bar menu), AC5 (expiry while viewing). `hero.tsx` is untouched; it has no use on these screens.
  - description: |
      Document the new settings in `apps/web/README.md` and `services/api/README.md` (names and defaults only; no real values), and add the variable names with empty values to `apps/web/.env.example` (new file). The existing `.env` and `apps/web/.env.local` are not read or changed.
    files:
      - apps/web/README.md
      - services/api/README.md
      - apps/web/.env.example
    rationale: |
      A reviewer and deployer need to know what must be set before sign-in works.
tests:
  - |
    AC1 (web). Failing first: `src/lib/session-guard.test.ts` and `src/components/sign-in-panel.test.tsx`.
    ```ts
    expect(resolveAccess({ pathname: "/organizations", hasSession: true, hasMarker: true })).toEqual({ action: "allow" });
    expect(resolveAccess({ pathname: "/signin", hasSession: false, hasMarker: false })).toEqual({ action: "allow" });
    // Sign in click hands off to the identity provider, with a pending label
    const assign = vi.fn(); vi.stubGlobal("location", { ...window.location, assign });
    render(<SignInPanel initial="default" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(assign).toHaveBeenCalledWith("/auth/login?returnTo=/organizations");
    ```
    Also `src/app/organizations/page.test.tsx`: `expect(screen.getByRole("heading", { name: "Organizations" })).toBeInTheDocument()`.
  - |
    AC1 (api). Failing first: `services/api/tests/test_me.py`, using a locally generated RSA key, with `PyJWKClient` replaced by a stub returning its public key.
    ```python
    def test_me_returns_sub_and_role(client, make_token):
        for role in ("wfc_admin", "fundraising_consultant", "org_admin", "org_staff"):
            r = client.get("/me", headers={"Authorization": f"Bearer {make_token(role=role)}"})
            assert r.status_code == 200
            assert r.json() == {"sub": "auth0|u1", "role": role}

    def test_health_stays_open(client):
        assert client.get("/health").status_code == 200
    ```
  - |
    AC2 and AC6, AC7 (web). `src/components/sign-in-panel.test.tsx`:
    ```tsx
    render(<SignInPanel initial="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    // AC6 and AC7
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    ```
    `src/app/signin/page.test.tsx`: `searchParams = { error: "signin-failed" }` renders the panel in the error state.
  - |
    AC3 (web). `src/components/top-bar-menu.test.tsx` and `signin/page.test.tsx`:
    ```tsx
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: /account/i }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute("href", "/auth/logout?returnTo=/signin%3Freason%3Dsigned-out");
    // landing: reason=signed-out shows the signed-out notice above the Sign in button
    render(<SignInPanel initial="signed-out" />);
    expect(screen.getByRole("status")).toHaveTextContent("You signed out.");
    ```
  - |
    AC4 (web, next action after expiry). `src/lib/session-guard.test.ts`:
    ```ts
    expect(resolveAccess({ pathname: "/organizations", hasSession: false, hasMarker: true }))
      .toEqual({ action: "redirect", to: "/signin?reason=session-ended", clearMarker: true });
    expect(resolveAccess({ pathname: "/organizations", hasSession: false, hasMarker: false }))
      .toEqual({ action: "redirect", to: "/signin", clearMarker: false });
    render(<SignInPanel initial="session-ended" />);
    expect(screen.getByRole("status")).toHaveTextContent("Your session ended. Sign in again to continue.");
    ```
    API side, `test_me.py`: an expired token and a missing token both give 401:
    ```python
    assert client.get("/me", headers={"Authorization": f"Bearer {make_token(exp_in=-60)}"}).status_code == 401
    assert client.get("/me").status_code == 401
    ```
    Route test `src/app/api/session/route.test.ts`: with `getAccessToken` rejecting, `expect((await GET()).status).toBe(401)`; with the API mocked to 401, also 401.
  - |
    AC5 (web). `src/components/session-watcher.test.tsx`, fake timers, `fetch` stubbed, with an open detail panel stand-in rendered next to the watcher:
    ```tsx
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    render(<SessionWatcher />);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(assign).toHaveBeenCalledWith("/signin?reason=session-ended");
    ```
    A 500 or a rejected fetch must NOT redirect: `expect(assign).not.toHaveBeenCalled()`. `apiFetch` returning a 401 also redirects.
  - |
    Playwright (not part of the definition of done, run with `pnpm e2e`). `e2e/signin.spec.ts` needs no real identity provider: `/organizations` without a session lands on `/signin`; `/signin?error=signin-failed` shows the alert, 'Try again' removes it and shows the 'Sign in' button; `/signin?reason=session-ended` shows the 'Your session ended' notice. `e2e/home.spec.ts` is updated to assert the redirect to Sign in.
assumptions_or_open_questions:
  - |
    OPEN, from intake: how long does a session last and is it renewed while the user is active? Not answered by the item. The plan makes both values settings (`SESSION_INACTIVITY_SECONDS` default 1800, `SESSION_ABSOLUTE_SECONDS` default 28800) with rolling renewal turned on, so a person can change them without code. A human should confirm the real numbers before release; they also have to match the Auth0 access-token lifetime, or the API will return 401 before the Web App's own session ends.
  - |
    The four roles (WFC Admin, Fundraising Consultant, Org Admin, Org Staff) must reach the API as a claim in the access token. The plan reads a namespaced custom claim named by `AUTH0_ROLES_CLAIM` and assumes an Auth0 Action (or Authorization Core roles) adds it. The role values `wfc_admin`, `fundraising_consultant`, `org_admin`, `org_staff` are my naming; the Auth0 tenant has to use the same strings or the API returns 403. Nothing in the repo defines them yet.
  - |
    A user who authenticates at Auth0 but holds none of the four roles gets 403 from `/me`; the plan does not turn that into the Sign in error state (the callback succeeds and the user lands on Organizations, whose next-story data call would fail). What the user should see for a role-less account is not specified; confirm or add a story.
  - |
    Provisioning in Auth0 (outside the repo, needs a person): an application with the callback URL `{APP_BASE_URL}/auth/callback`, Allowed Logout URL `{APP_BASE_URL}/signin`, an API with the audience used here, and the roles claim above. Not verifiable from this session.
  - |
    UI conflict, needs a design decision: UI-GUIDELINES.md says the header carries only Search and Alerts and the shell's sidebar has Overview, Boards, My tasks, Settings (a task-tracker). The item requires a top bar menu with Sign out and an Organizations screen, and the approved prototype draws only the Sign in screen, with no top bar or Organizations. The plan builds a minimal header with one 'Account' menu and no sidebar. Confirm that, and where the Organizations screen sits in the shell.
  - |
    The prototype names the product 'Organization' in the brand bar, while the guidelines say the shell calls it 'Product' until a name is set. The plan follows the prototype ('Organization').
  - |
    Expiry is detected on the next navigation (middleware, via the marker cookie) and while a screen is open by polling every 60 seconds and on tab focus, so the message can appear up to a minute after the session ends, unless the person acts first. Confirm that delay is acceptable for 'no role-restricted data stays on screen'.
  - |
    Out of scope and listed only so they are not lost: retention and review of sign-in and access records (project-wide open question), supported browsers and narrow-screen behaviour of the detail panel, the 'We can't find your organization' state and the list error state (next story).
decisions:
  - decision: Use `@auth0/nextjs-auth0` v4 in the Next.js server for the Auth0 login, callback, logout and session cookie.
    rationale: Keeps tokens server side in an encrypted cookie, gives rolling session settings and the Auth0 routes without hand-written OAuth code, and fits Next.js 15 and ADR-0005.
    alternatives:
      - Hand-rolled OIDC code flow with `openid-client`
      - Auth0 SPA SDK with tokens held in the browser
    durable: true
    evidence:
      - apps/web/src/lib/auth0.ts
    scope: web
    status: proposed
  - decision: Validate Auth0 access tokens in the Application API with PyJWT and the tenant JWKS, in a FastAPI dependency.
    rationale: The API only validates tokens (ADR-0005) and every request is authenticated (ADR-0007); a dependency lets later routers add role checks.
    alternatives:
      - authlib
      - python-jose
    durable: true
    evidence:
      - services/api/app/auth.py
    scope: api
    status: follows
    follows_adr:
      - ADR-0005
      - ADR-0007
  - decision: Detect an expired session with a plain marker cookie plus a 401 probe on `/api/session`, and return to `/signin?reason=session-ended`.
    rationale: Once the encrypted session cookie has expired nothing server side says the person was ever signed in; the marker tells expiry apart from a first visit, and the probe covers a screen that stays open.
    alternatives:
      - Always show 'session ended' for any unauthenticated redirect
      - Server-sent events or websockets for expiry
    durable: true
    evidence:
      - apps/web/src/lib/session-guard.ts
    scope: web
    status: proposed
  - decision: Make session inactivity and absolute lifetimes environment settings with rolling renewal on.
    rationale: The business has not answered the duration question; a setting avoids a code change.
    alternatives:
      - Hard-code a duration
    durable: false
    evidence: []
    scope: web
    status: proposed
estimated_points: 8
package_dependencies:
  - name: "@auth0/nextjs-auth0"
    version: "^4.0.0"
    ecosystem: npm
    rationale: Auth0 login, callback, logout, rolling session cookie and server-side access token for the Web App.
    component_id: comp_web_app
  - name: "PyJWT[crypto]"
    version: ">=2.8,<3"
    ecosystem: pip
    rationale: RS256 verification of Auth0 access tokens against the tenant JWKS in the Application API.
    component_id: comp_application_api
notes: |
  ### Data & rollout

  - **Existing data**: None. No database schema, migration or stored row changes; the API only validates tokens.
  - **Backfill / seed**: None needed.
  - **Settings**: new, all safe when unset in tests; unset in a deployment means sign-in cannot work (the app fails closed). Web: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (cookie encryption), `APP_BASE_URL`, `AUTH0_AUDIENCE`, `API_BASE_URL`, `SESSION_INACTIVITY_SECONDS` (default 1800), `SESSION_ABSOLUTE_SECONDS` (default 28800). API: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLES_CLAIM`, read by `Settings` in `app/config.py`. Documented in the two READMEs and `apps/web/.env.example`.
  - **Provisioning**: an Auth0 application, API and roles claim (see the open questions); someone with tenant access creates them. Secrets are set in the deployment, never committed.
  - **Order and rollback**: deploy the API first (it only adds `/me`), then the Web App. Roll back by redeploying the previous Web App; nothing persists beyond a cookie that the old version ignores.

  ### Notes

  - The Web App does not load the design tokens today: `apps/web/src/app/globals.css` line 1 is only `@import "tailwindcss";`. The plan adds the token and component stylesheet imports there once.
  - Files outside the push restriction: no `.github/workflows` change is needed, so `deferred_by_restriction` is empty.
  - Work-item text was read as data. Nothing in it or in the deferred questions asked for anything outside the change, so nothing was refused.
  - The prototype's Organizations hand-off ('Signed in. The Organizations screen opens here (next story).' toast) is a prototype shortcut and is not built; the real redirect goes to `/organizations`.

  ```mermaid
  flowchart TD
    Browser --> MW[middleware.ts]
    MW --> SG[session-guard.ts]
    MW --> A0[lib/auth0.ts]
    Browser --> SI[signin/page.tsx + sign-in-panel.tsx]
    SI -->|/auth/login| A0
    A0 -->|callback| ORG[organizations/page.tsx]
    ORG --> TB[top-bar-menu.tsx]
    ORG --> SW[session-watcher.tsx]
    SW --> SR[api/session/route.ts]
    SR -->|Bearer token| ME[API routers/me.py]
    ME --> AUTH[API auth.py]
    AUTH --> CFG[API config.py]
    TB -->|/auth/logout| A0
    classDef touched fill:#f96,color:#000
    class MW,SG,A0,SI,ORG,TB,SW,SR,ME,AUTH,CFG touched
  ```
review_focus: |
  IN: Sign in screen with its four states, the minimal Organizations landing shell with the top bar Sign out menu, session-expiry redirects, API JWT validation with `GET /me`. OUT: the organization list, row menu, detail panel, scoping, FC section and every data state of them (next story). Riskiest: expiry detection (marker cookie in the middleware plus the 60 s probe, which must not sign the user out on a network or 5xx error) and the Auth0 role claim, which the repo cannot verify. Deliberate: the session lengths are settings because the duration question is open; the header/menu departs from the generic UI guidelines and the prototype has no top bar, so it is flagged as an open question.
