summary: |
  Build the Sign in screen (sign-in and Create account tabs, "Continue with Auth0" / "Sign up with Auth0" buttons, error, unverified, verify-email and loading states) in the Next.js Web App, wired to Auth0 for real. Next route handlers on the Web App server talk to Auth0 (the managed Identity Provider, ADR-0005) and keep the issued token in an httpOnly session cookie. The Application API gains one authenticated endpoint, GET /api/me, that validates the Auth0 JWT (ADR-0007) and returns the traveller's name and email. A minimal /profile route reads that endpoint and shows name and email with no required preferences step; the rest of the profile belongs to the profile story. No database change: Auth0 owns the account record.
scope:
  - description: |
      API: Auth0 settings. Add auth0_domain, auth0_audience to Settings (default "" so the app still boots and the health test passes when unset).
    files:
      - services/api/app/config.py
      - services/api/.env.example
    rationale: |
      Safe defaults when unset; documented in .env.example.
  - description: |
      API: JWT validation dependency `current_user(credentials) -> Claims` in `app/auth.py`. Verifies RS256 signature against Auth0 JWKS (cached), issuer, audience and expiry; 401 on missing/invalid token. Add `app/routers/me.py` with `GET /api/me -> {"name": str, "email": str}`; name and email come from Auth0 `/userinfo` called with the bearer token. Register the router in `app/main.py`.
      ```python
      def current_user(creds: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))) -> Claims: ...
      @router.get("/api/me", response_model=Me)
      def me(claims: Claims = Depends(current_user)) -> Me: ...
      ```
    files:
      - services/api/app/auth.py
      - services/api/app/routers/me.py
      - services/api/app/main.py
      - services/api/tests/test_me.py
    rationale: |
      ADR-0002 (web reads go through the API) and ADR-0007 (every API request authenticated by a valid JWT). The API only validates tokens; it never issues them (ADR-0005).
  - description: |
      Web: load the design system once. In `globals.css` add `@import "../../design/tokens.css";` and `@import "../../design/prototype-utils.css";` after the tailwind import (prototype-utils.css defines .stack, .btn, .field, .input, .tabs, .tab, .card, .badge, .alert; confirm .btn-primary, .btn-ghost, .alert-*, .field-error, .field-hint, .badge-primary are defined there before relying on them). Today globals.css holds only `@import "tailwindcss";` (apps/web/src/app/globals.css:1) and nothing loads tokens. Add the feature-local `.auth-*` rules from the prototype (auth-page, auth-header, auth-logo, auth-main, auth-card, auth-spin, auth-handoff), written on tokens only, in a new `auth.css` imported by globals.css.
    files:
      - apps/web/src/app/globals.css
      - apps/web/src/app/auth.css
    rationale: |
      The prototype's classes come from the design system stylesheet and its own inline `<style>`; no hex or px literals.
  - description: |
      Web: server-side Auth0 client `src/lib/auth0.ts` and route handlers. `POST /api/auth/sign-in` ({email,password}) calls Auth0 `POST https://{AUTH0_DOMAIN}/oauth/token` (grant_type `http://auth0.com/oauth/grant-type/password-realm`) and responds `200 {ok:true}` and sets an httpOnly, Secure, SameSite=Lax cookie `session` holding the access token, `401 {code:"invalid_credentials"}` on rejection, `403 {code:"email_not_verified", email}` when Auth0 refuses an unverified email, `502 {code:"unavailable"}` otherwise. `POST /api/auth/sign-up` ({name,email,password}) calls Auth0 `POST /dbconnections/signup`, answers `201 {code:"verify_email", email}` or `400 {code:"sign_up_rejected"}`. No social connection is used anywhere. `/api/auth/sign-in` never logs passwords.
    files:
      - apps/web/src/lib/auth0.ts
      - apps/web/src/app/api/auth/sign-in/route.ts
      - apps/web/src/app/api/auth/sign-up/route.ts
      - apps/web/src/lib/auth0.test.ts
      - apps/web/src/app/api/auth/auth-routes.test.ts
      - apps/web/.env.example
    rationale: |
      ADR-0005: sign-in and token issuing happen only at Auth0. Server-side handlers keep the client secret off the browser.
  - description: |
      Web: Sign in screen at `/sign-in` per the approved prototype (form template, outside the app shell, own slim header with the "Product" logo; centred `.card.auth-card` max width from tokens). Components in `src/components/auth/`: `SignInScreen` (state machine: default | sign-up | loading | error | unverified | sign-up-error | verify-email), uses tabs "Sign in" / "Create account" (`role=tablist`, `aria-selected`), forms with Email / Password (and Full name on sign-up, hint "At least 8 characters."), `.field-error` next to its field. Submit sets state `loading`: both Auth0 buttons render disabled with `.auth-spin` and labels "Continuing…" / "Signing up…", `aria-busy=true`. Error states render the `.alert-danger` / `.alert-warning` copy from the prototype with "Try again": sign-in error and unverified return to the Sign in tab, sign-up error returns to the Create account tab. Unverified state tells the traveller to verify their email address. Verify-email state shows the address Auth0 mailed. On sign-in success `router.push("/profile")`. Reuse: the existing `Hero` component is a bare h1 and does not cover the screen, so no existing component is extended; new components only. Icons: none needed from the sprite. Tokens used: --color-bg, --color-surface, --color-border, --color-fg, --color-fg-muted, --color-primary, --color-primary-text, --color-danger-*, --color-warning-*, --space-1..7, --header-height, --page-gutter, --control-height-lg, --font-size-2xl, --font-weight-heading, --radius-md, --border-width(-strong), --icon-size-sm, --container-sm. Spinner animation off under prefers-reduced-motion (as in prototype).
    files:
      - apps/web/src/app/sign-in/page.tsx
      - apps/web/src/components/auth/sign-in-screen.tsx
      - apps/web/src/components/auth/sign-in-screen.test.tsx
      - apps/web/e2e/sign-in.spec.ts
    rationale: |
      Covers ACs 2-5, 7, 11-20. No social sign-in markup, no "Trips" link (the prototype's Trips button is a placeholder toast for another item).
  - description: |
      Web: minimal `/profile` route. Server component reads the `session` cookie, calls `GET {API_BASE_URL}/api/me` with the bearer token, redirects to `/sign-in` with no/invalid session, and renders labelled Name and Email fields filled with the returned values and no preferences step (a non-required "Preferences" note only). Profile content beyond this belongs to the profile story.
    files:
      - apps/web/src/app/profile/page.tsx
      - apps/web/src/app/profile/page.test.tsx
    rationale: |
      Covers ACs 1, 8, 9, 10 (the landing target).
tests:
  - |
    AC1 / AC8 (apps/web/src/app/api/auth/auth-routes.test.ts, written first): with global fetch mocked to return Auth0 200 token JSON, POST sign-in sets the cookie and returns ok.
    ```ts
    const res = await signIn(req({ email: "a@example.com", password: "pw" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/session=.*HttpOnly/i);
    ```
  - |
    AC1 / AC8 (sign-in-screen.test.tsx): after a successful sign-in the router goes to the profile.
    ```ts
    await user.click(screen.getByRole("button", { name: "Continue with Auth0" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile"));
    ```
  - |
    AC2 (sign-in-screen.test.tsx): no social option.
    ```ts
    expect(screen.queryByRole("button", { name: /google|facebook|apple|github|social/i })).toBeNull();
    ```
  - |
    AC3 and AC4 (sign-in-screen.test.tsx):
    ```ts
    expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument();
    ```
  - |
    AC5 (sign-in-screen.test.tsx) and e2e (apps/web/e2e/sign-in.spec.ts): the Auth0 buttons show.
    ```ts
    expect(screen.getByRole("button", { name: "Continue with Auth0" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Create account" }));
    expect(screen.getByRole("button", { name: "Sign up with Auth0" })).toBeInTheDocument();
    ```
  - |
    AC6 (auth-routes.test.ts): sign-up calls Auth0 signup with the name, email and password and responds 201.
    ```ts
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/dbconnections/signup"), expect.anything());
    expect(res.status).toBe(201);
    ```
  - |
    AC7 (sign-in-screen.test.tsx): a 201 `verify_email` response shows the verify-email state.
    ```ts
    expect(await screen.findByText(/verify your email address to finish creating your account/i)).toBeInTheDocument();
    ```
  - |
    AC9 and AC10 (profile/page.test.tsx), `/api/me` mocked to return Amara Okafor:
    ```ts
    expect(screen.getByLabelText("Name")).toHaveValue("Amara Okafor");
    expect(screen.getByLabelText("Email")).toHaveValue("amara.okafor@example.com");
    expect(screen.queryByText(/required/i)).toBeNull();
    ```
  - |
    AC11 (auth-routes.test.ts and screen test): Auth0 answers 403 `invalid_grant`; route returns 401 `invalid_credentials`; screen shows the danger alert.
    ```ts
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in failed. Check your details and try again.");
    ```
  - |
    AC12 and AC13 (screen test): the error shows Try again, and selecting it returns to the Sign in form.
    ```ts
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toBeInTheDocument();
    ```
  - |
    AC14 and AC15 (auth-routes.test.ts and screen test): Auth0 answers `access_denied` with "Please verify your email before logging in."; route returns 403 `email_not_verified` and sets no cookie; screen shows the unverified alert.
    ```ts
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await screen.findByRole("alert")).toHaveTextContent(/verify your email address/i);
    ```
  - |
    AC16, AC17, AC18 (auth-routes.test.ts and screen test): signup 400 gives `sign_up_rejected`; alert "Sign-up failed."; Try again shows the Create account tab.
    ```ts
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("tab", { name: "Create account", selected: true })).toBeInTheDocument();
    ```
  - |
    AC19 and AC20 (screen test), fetch left pending:
    ```ts
    const buttons = screen.getAllByRole("button", { name: /with Auth0, loading/ });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByRole("heading", { name: "Contacting Auth0" }).closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    ```
  - |
    API (services/api/tests/test_me.py, first): no token gives 401; a token signed by a test RSA key with the right iss/aud gives 200 with name and email (JWKS and userinfo stubbed); expired or wrong-audience gives 401.
    ```python
    assert client.get("/api/me").status_code == 401
    r = client.get("/api/me", headers={"Authorization": f"Bearer {good_token}"})
    assert r.status_code == 200 and r.json() == {"name": "Amara Okafor", "email": "amara.okafor@example.com"}
    ```
assumptions_or_open_questions:
  - |
    Prototype vs ADR-0005 / Auth0 best practice: the design collects email and password inside the Sign in screen, so the plan uses Auth0's password-realm grant from a server route. That grant must be enabled on the Auth0 application and is discouraged by Auth0 (the alternative, Universal Login redirect, would put the form on Auth0's page and contradict the approved design and ACs 11-20 that show errors on this screen). Please confirm.
  - |
    Auth0 tenant provisioning is outside the repo: a Database connection with "Require email verification" on (so Auth0 sends the verification message at sign-up and refuses unverified sign-ins), the password grant enabled, an API (audience) and an application. AC7 and AC14 depend on this.
  - |
    The prototype's "Resend verification email" button is not in any AC and needs a further Auth0 call; left out. Say if it should be added.
  - |
    No local traveller row is created (AC6 "the account is created" is met by the Auth0 user). A local profile record is deferred to the profile story. Confirm.
  - |
    Deferred questions not answerable from the item: password policy (the prototype's hint says at least 8 characters, to be matched to the Auth0 connection's policy), session length and refresh (the cookie lifetime follows the access token expiry; no refresh), account recovery (no "Forgot password" in the prototype or ACs, so none planned), first admin account, account deletion, and data retention. None block this story.
  - |
    The /profile route here is a minimal landing shell so ACs 1, 8, 9 and 10 can be verified; the profile story will replace its content.
  - |
    The work item text and deferred questions contained no instructions to read credentials or contact external URLs beyond the Auth0 integration itself; nothing was refused.
decisions:
  - decision: Sign in and sign up from Next.js server route handlers that call Auth0 directly, storing the access token in an httpOnly cookie.
    rationale: Keeps the client secret and tokens out of browser JavaScript and lets the design's in-page states render without redirecting away.
    alternatives:
      - Auth0 Universal Login redirect (contradicts the approved design)
      - A new auth library such as next-auth or @auth0/nextjs-auth0
    durable: true
    evidence:
      - apps/web/src/app/api/auth/sign-in/route.ts
    scope: web
    status: proposed
  - decision: The Application API validates Auth0 JWTs (RS256 via JWKS) and never issues tokens.
    rationale: ADR-0005 and ADR-0007.
    alternatives: []
    durable: false
    evidence: []
    scope: api
    status: follows
    follows_adr:
      - ADR-0005
      - ADR-0007
  - decision: The Web App reads the traveller's name and email through GET /api/me on the Application API.
    rationale: ADR-0002 requires all Web App reads to go through the API.
    alternatives:
      - Decode the ID token in the Web App
    durable: false
    evidence: []
    scope: web
    status: follows
    follows_adr:
      - ADR-0002
estimated_points: 8
package_dependencies:
  - name: pyjwt
    version: ">=2.9,<3"
    ecosystem: pip
    rationale: Verify Auth0 RS256 JWTs against the JWKS in the API (extra crypto for RSA keys).
    component_id: comp_application_api
  - name: cryptography
    version: ">=43"
    ecosystem: pip
    rationale: RSA signature verification backend for PyJWT.
    component_id: comp_application_api
notes: |
  ### Data & rollout
  - **Existing data**: None — no database schema, migration or stored data changes; Auth0 holds the accounts.
  - **Backfill / seed**: None.
  - **Settings**: API `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (default empty; `/api/me` returns 401 when unset); Web `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, `AUTH0_DB_CONNECTION`, `API_BASE_URL` (no secret defaults). Documented in `services/api/.env.example` and `apps/web/.env.example`.
  - **Provisioning**: the Auth0 tenant items in the open questions, plus the same values set as container environment in AWS eu-central-1 (ADR-0006).
  - **Order and rollback**: deploy the API first (additive endpoint), then the Web App; roll back by reverting either, nothing is migrated.

  Design: read `TESTING-27-NOV-STORY-020-design.html` (form template, centred card, tabs, states default / sign-up / loading / error / unverified / sign-up-error / verify-email / signed-in). The "signed-in" hand-off screen in the prototype is a prototype shortcut: production redirects straight to /profile (AC1, AC8), so it is not built. The app's tokens were not loaded before (`apps/web/src/app/globals.css:1` only imports tailwindcss; `layout.tsx` uses literal slate/white classes), so the import above is part of scope.

  ```mermaid
  flowchart TD
    SI[sign-in page and SignInScreen]:::touched --> R1[api/auth sign-in and sign-up routes]:::touched
    R1 --> A0[(Auth0)]
    R1 --> L[lib/auth0.ts]:::touched
    P[profile page]:::touched --> ME[API GET /api/me]:::touched
    ME --> AU[app/auth.py JWT validation]:::touched
    AU --> A0
    ME --> M[app/main.py]:::touched
    G[globals.css + design tokens]:::touched --> SI
    classDef touched fill:#f96,color:#000
  ```
review_focus: |
  Held to: the Sign in screen states, Auth0 route handlers, GET /api/me and a minimal /profile landing; profile content, roles, account recovery and local traveller storage are OUT. Riskiest parts: the password-realm Auth0 call (flagged as an open question against the design) and JWT validation in the API (issuer, audience, expiry). The prototype's Trips link, "Resend verification email" and signed-in hand-off screen are deliberately not built.
