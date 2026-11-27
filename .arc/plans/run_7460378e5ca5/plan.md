summary: |
  Build the HR-admin "Job openings" feature end to end. The Application API (FastAPI, psycopg, PostgreSQL) gets JWT validation with an HR-admin role check, a `job_openings` table (plus a minimal `candidates` table so counts and the close rule are real), and five endpoints: list with candidate counts, create, edit details, open, close. Close is refused with 409 while any candidate is in Applied, Screening, Interview or Offer. The Web App (Next.js 15, Tailwind, design tokens) gets a `/job-openings` page that follows the approved prototype: table with Status badge and Candidates count, create/edit drawer with per-field errors, close confirmation modal, and loading, empty, error and forbidden states. The design tokens and the design system's component stylesheet are not loaded by the app yet, so they are wired in once.

scope:
  - description: |
      API: settings and JWT auth. Add settings `auth_issuer`, `auth_audience`, `auth_jwks_url`, `auth_roles_claim` (default `https://hr.example/roles`, see open questions) and `hr_admin_role` (default `hr_admin`). New `app/auth.py`:

      ```python
      class CurrentUser(BaseModel):
          subject: str
          roles: list[str]

      def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser: ...  # 401 on missing/invalid/expired token
      def require_hr_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser: ...  # 403 when settings.hr_admin_role not in user.roles
      ```
      Signature keys come from a `get_signing_key_resolver` dependency (PyJWKClient against `auth_jwks_url` in production) so tests can override it with a locally generated RSA key. Tokens are only validated here, never issued (ADR-0005).
    files:
      - services/api/app/config.py
      - services/api/app/auth.py
      - services/api/pyproject.toml
      - services/api/uv.lock
    rationale: |
      ADR-0007 requires every API request to carry a valid JWT and be authorised by role. No auth code exists yet (main.py only mounts the health router), so this story has to introduce the smallest seam that the HR-admin rule needs. `/health` stays open.
  - description: |
      API: schema and persistence. SQL migration `services/api/migrations/0001_job_openings.sql` creates `job_openings` (id bigint identity, title, department, location, employment_type check in ('Full time','Part time','Contract'), description text not null default '', status check in ('open','closed') default 'open', created_at, updated_at) and a minimal `candidates` (id bigint identity, opening_id fk to job_openings, stage check in ('Applied','Screening','Interview','Offer','Hired','Rejected','Withdrawn')). A small runner `app/migrate.py` applies unapplied files in order and records them in `schema_migrations`. `app/repositories/job_openings.py` defines a `JobOpeningRepository` Protocol and `PostgresJobOpeningRepository` (psycopg 3, raw SQL, no ORM). Close runs in one transaction: `SELECT ... FOR UPDATE` on the opening, count candidates in the four active stages, then update. The list query uses a LEFT JOIN with `count(c.id)` so an opening without candidates returns 0, and counts every stage including Rejected and Withdrawn.
    files:
      - services/api/migrations/0001_job_openings.sql
      - services/api/app/migrate.py
      - services/api/app/repositories/__init__.py
      - services/api/app/repositories/job_openings.py
      - services/api/app/db.py
    rationale: |
      ADR-0003: only the API touches the database. The candidates story is separate, but counts (AC 6, 7) and the close rule (AC 4, 5) cannot exist without a candidate stage, so this story only creates the minimum table; the candidates story extends it. Locking the opening row makes close safe against a candidate being added concurrently.
  - description: |
      API: router and models. `app/routers/job_openings.py`, mounted in `app/main.py`, all routes behind `Depends(require_hr_admin)`:

      ```
      GET   /job-openings              -> 200 list[JobOpeningOut]
      POST  /job-openings              -> 201 JobOpeningOut (status always "open")
      PATCH /job-openings/{id}         -> 200 JobOpeningOut (details only; extra="forbid" so a "status" field is a 422)
      POST  /job-openings/{id}/open    -> 200 JobOpeningOut (idempotent)
      POST  /job-openings/{id}/close   -> 200 JobOpeningOut, or 409 {"detail": {"code": "candidates_in_progress", "in_progress": n}}
      ```
      `JobOpeningOut` fields: `id`, `reference` (`JO-` plus the id, for display), `title`, `department`, `location`, `employment_type`, `description`, `status`, `candidate_count`, `in_progress_count`. Input fields `title`, `department`, `location`, `employment_type` are required and trimmed with `min_length=1`; whitespace-only counts as empty. Unknown id returns 404. A `get_job_opening_repository` dependency returns the Postgres repository so tests can override it.
    files:
      - services/api/app/routers/job_openings.py
      - services/api/app/schemas/__init__.py
      - services/api/app/schemas/job_openings.py
      - services/api/app/main.py
    rationale: |
      ADR-0002: the API enforces the role check on admin operations; the Web App never talks to the database. The role check is on the router so the list endpoint also refuses non-HR users (AC 9).
  - description: |
      Web: load the design system once. Import `../../design/tokens.css` and `../../design/prototype-utils.css` in `src/app/globals.css` after `@import "tailwindcss"` (globals.css is imported by `src/app/layout.tsx:3`; today it only contains the Tailwind import, so no tokens are loaded). Copy `design/icons.svg` to `public/icons.svg` so `<use href="/icons.svg#i-plus"/>` resolves. Add the prototype's own small classes (`.opening-id`, `.count-total`, `.count-split`, `.row-actions`, `.drawer-body`, `.drawer-foot`, the below-820px stacked-table rules and `.panel-head`) to a new `src/app/job-openings/job-openings.css` on tokens only. Change the `<body>` classes in layout.tsx from `bg-white text-slate-900` to token-based styling (`background: var(--color-bg); color: var(--color-fg)`), which dark mode needs.
    files:
      - apps/web/src/app/globals.css
      - apps/web/src/app/layout.tsx
      - apps/web/public/icons.svg
      - apps/web/src/app/job-openings/job-openings.css
    rationale: |
      The prototype's classes (`.table`, `.drawer`, `.modal`, `.backdrop`, `.badge-success`, `.btn-danger`, `.field-error`, `.empty-state`, `.skeleton`, `.alert-danger`, `.toast`, `.toolbar`, `.page-header`) are all defined in `apps/web/design/prototype-utils.css` (verified), so we import it rather than redefine. `.opening-id`, `.count-total`, `.count-split`, `.row-actions`, `.drawer-body`, `.drawer-foot` and `.panel-head` are defined only in the prototype's inline style, so they are defined in the app on the same tokens.
  - description: |
      Web: API client and page. `src/lib/api/job-openings.ts` exports `listJobOpenings`, `createJobOpening`, `updateJobOpening`, `openJobOpening`, `closeJobOpening`, each sending `Authorization: Bearer <token>` from a `getAccessToken()` seam in `src/lib/session.ts`, to `process.env.NEXT_PUBLIC_API_BASE_URL`. Errors are typed (`ForbiddenError`, `ValidationError` carrying a field-to-message map, `CloseRefusedError` carrying `inProgress`). Page `src/app/job-openings/page.tsx` renders `JobOpeningsView` from `src/components/job-openings/`: `job-openings-view.tsx` (toolbar with summary and "Create opening", table, states), `opening-form-drawer.tsx` (create/edit, one `.field-error` beside each of title, department, location, employment type; a status note instead of a status control), `close-opening-modal.tsx` (confirm, copy from the prototype), and `states.tsx` (loading `.skeleton` rows, empty `.empty-state` with "Create opening", error `.alert-danger` with "Try again", forbidden `.empty-state` shown on a 403). Layout template: **table**, inside the sidebar shell. Icons: `plus` (Create opening), `users` (empty state), `user` (forbidden state), all `aria-hidden`. Tokens used: `--space-*`, `--density-row-height`, `--density-padding`, `--color-surface`, `--color-surface-subtle`, `--color-border`, `--color-fg-muted`, `--color-success-soft` and `--color-success-text` (Open badge), `--color-danger-soft` and `--color-danger-text`, `--color-danger-solid` (Close opening button), `--font-size-*`, `--font-family-mono`, `--icon-size-lg`, `--radius-card`.
    files:
      - apps/web/src/lib/api/job-openings.ts
      - apps/web/src/lib/session.ts
      - apps/web/src/app/job-openings/page.tsx
      - apps/web/src/components/job-openings/job-openings-view.tsx
      - apps/web/src/components/job-openings/opening-form-drawer.tsx
      - apps/web/src/components/job-openings/close-opening-modal.tsx
      - apps/web/src/components/job-openings/states.tsx
      - apps/web/src/components/app-shell.tsx
    rationale: |
      ADR-0002: all reads and writes go through the API. The existing `hero` component covers only a heading and is not reusable here, so new components are needed; `app-shell.tsx` is a small wrapper following `design/app-shell.html` (Overview, Boards, My tasks, Settings, in that order; labels not renamed). The prototype marks Settings as the active item (`data-nav="settings"`) because this page is not one of the four sidebar items; the page keeps that item active.
  - description: |
      Config and docs: document the new env vars (`AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `AUTH_ROLES_CLAIM`, `HR_ADMIN_ROLE` for the API; `NEXT_PUBLIC_API_BASE_URL` for the web) and how to run `python -m app.migrate` in the API and web READMEs.
    files:
      - services/api/README.md
      - apps/web/README.md
    rationale: |
      A deploy needs to know what to set and the order (migrate, then deploy code).

tests:
  - |
    AC1 (create appears in list). API, `services/api/tests/test_job_openings.py`, in-memory repository override and an HR-admin token fixture:
    ```python
    r = client.post("/job-openings", json=VALID, headers=hr_admin)
    assert r.status_code == 201
    listed = client.get("/job-openings", headers=hr_admin).json()
    assert [o["title"] for o in listed] == [VALID["title"]]
    ```
    Web, `job-openings-view.test.tsx`: submitting the drawer form calls `createJobOpening` and the new title is in the table (`expect(await screen.findByText("Payroll specialist")).toBeInTheDocument()`).
  - |
    AC2 (edit details). API:
    ```python
    created = client.post("/job-openings", json=VALID, headers=hr_admin).json()
    r = client.patch(f"/job-openings/{created['id']}", json={"location": "Munich"}, headers=hr_admin)
    assert r.status_code == 200
    assert client.get("/job-openings", headers=hr_admin).json()[0]["location"] == "Munich"
    assert client.patch(f"/job-openings/{created['id']}", json={"status": "closed"}, headers=hr_admin).status_code == 422
    ```
    Web: clicking "Edit Payroll specialist" opens the drawer with the saved values and heading "Edit opening"; after saving, the row shows the new value.
  - |
    AC3 (open a closed opening). API:
    ```python
    repo.seed(status="closed", id=1)
    r = client.post("/job-openings/1/open", headers=hr_admin)
    assert r.json()["status"] == "open"
    assert client.get("/job-openings", headers=hr_admin).json()[0]["status"] == "open"
    ```
    Web: a closed row shows an "Open Benefits analyst" button; after clicking, the badge reads "Open".
  - |
    AC4 (close when all candidates finished). API, parametrised over Hired, Rejected and Withdrawn:
    ```python
    repo.seed(id=1, candidates=[stage])
    assert client.post("/job-openings/1/close", headers=hr_admin).json()["status"] == "closed"
    ```
    Web: for an opening with `in_progress_count` 0, clicking "Close" opens the modal "Close this opening?"; confirming with "Close opening" calls `closeJobOpening` and the badge reads "Closed".
  - |
    AC5 (close refused). API, parametrised over Applied, Screening, Interview and Offer, plus a mixed case with one Hired and one Interview:
    ```python
    repo.seed(id=1, candidates=["Hired", stage])
    r = client.post("/job-openings/1/close", headers=hr_admin)
    assert r.status_code == 409
    assert r.json()["detail"] == {"code": "candidates_in_progress", "in_progress": 1}
    assert client.get("/job-openings", headers=hr_admin).json()[0]["status"] == "open"
    ```
    Web: a `CloseRefusedError` shows the `role="alert"` text "stays open" and the row badge stays "Open".
  - |
    AC6 (counts include Rejected and Withdrawn). API:
    ```python
    repo.seed(id=1, candidates=["Applied", "Rejected", "Withdrawn", "Hired"])
    assert client.get("/job-openings", headers=hr_admin).json()[0]["candidate_count"] == 4
    ```
    Web: the Candidates cell shows the total ("4") and "1 in progress, 3 finished".
  - |
    AC7 (zero candidates). API: `assert client.get("/job-openings", headers=hr_admin).json()[0]["candidate_count"] == 0`. Web: the cell shows "0" and "No candidates yet". Also a Postgres-backed test in `test_job_openings_repository.py` (skipped unless `TEST_DATABASE_URL` is set) that the LEFT JOIN returns 0, not a missing row, so the count cannot be proven only by the in-memory fake.
  - |
    AC8 (non-HR refused). API, parametrised over create, edit, open and close with a token whose roles do not contain `hr_admin`:
    ```python
    assert client.post("/job-openings", json=VALID, headers=plain_user).status_code == 403
    assert client.patch("/job-openings/1", json={"title": "x"}, headers=plain_user).status_code == 403
    assert client.post("/job-openings/1/open", headers=plain_user).status_code == 403
    assert client.post("/job-openings/1/close", headers=plain_user).status_code == 403
    assert repo.list() == []  # nothing was changed
    ```
    Also, in `test_auth.py`: no token, an expired token and a token signed with another key each give 401.
  - |
    AC9 (non-HR sees nothing). API: `r = client.get("/job-openings", headers=plain_user); assert r.status_code == 403; assert "title" not in r.text`. Web: when `listJobOpenings` rejects with `ForbiddenError`, `expect(screen.getByRole("heading", { name: "Job openings are for HR admins" })).toBeInTheDocument()` and no table is rendered.
  - |
    AC10 (required field empty). API, parametrised over `title`, `department`, `location`, `employment_type`, both empty and whitespace-only:
    ```python
    r = client.post("/job-openings", json={**VALID, field: ""}, headers=hr_admin)
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"][-1] == field
    assert client.get("/job-openings", headers=hr_admin).json() == []
    ```
    Web: submitting with an empty title shows "Enter a job title." in the `.field-error` next to the field, with `aria-invalid="true"` on the input, and `createJobOpening` is not called; the same for each other required field with its prototype message. Server `ValidationError` field messages are shown beside the same field.
  - |
    AC11 (new opening is open). API: `assert client.post("/job-openings", json=VALID, headers=hr_admin).json()["status"] == "open"`, and a request body with `"status": "closed"` is a 422. Web: after create, the new row's badge text is "Open".
  - |
    AC12 (close with no candidates). API: `repo.seed(id=1, candidates=[]); assert client.post("/job-openings/1/close", headers=hr_admin).json()["status"] == "closed"`. Web: the modal body reads "It has no candidates. You can open it again later."
  - |
    Web states (loading, empty, error): while the request is pending, `screen.getByRole("status", { name: "Loading job openings" })` is shown; an empty list shows "No job openings yet" with one "Create opening" button; a network failure shows "Job openings could not be loaded" and "Try again" reloads.
  - |
    Playwright smoke test `apps/web/e2e/job-openings.spec.ts`: with the API mocked via `page.route`, create an opening, see it listed as Open, try to close an opening with a candidate in progress and see the refusal. Narrow commands: `(cd services/api && uv run --no-sync --offline pytest tests/test_job_openings.py tests/test_auth.py -q)` and `(cd apps/web && pnpm vitest run src/components/job-openings)`.

assumptions_or_open_questions:
  - |
    Web sign-in does not exist in the repository (no Auth0 integration in `apps/web`). This plan only adds a `getAccessToken()` seam in `src/lib/session.ts` and the bearer header; wiring the Auth0 login flow (ADR-0005) is not planned here. Without it a real browser has no token, so the page would show the forbidden state in a real deployment. Please confirm whether sign-in is a separate story (a recommended split) or must be added here.
  - |
    How does the Auth0 token carry roles, and what is the HR admin role called? Assumed a namespaced custom claim holding a list of role names, with the HR admin role named `hr_admin`; both are settings (`AUTH_ROLES_CLAIM`, `HR_ADMIN_ROLE`). ADR-0007 only says "user vs admin", so it is not confirmed that a distinct HR admin role exists.
  - |
    The `candidates` table is created here as a minimum (id, opening_id, stage) because counts and the close rule need it; the candidates story must extend it, not re-create it. Confirm the stage names and that no candidate is stored elsewhere.
  - |
    The prototype puts the page under the Settings sidebar item and the product's navigation has no Job openings entry (UI guidelines forbid adding sidebar items). Where this page is reachable from is not settled; the plan only serves the route `/job-openings` with Settings active.
  - |
    The prototype closes the drawer with a rotated `plus` glyph because the icon set has no close glyph. The plan keeps that, with `aria-label="Close panel"`; a dedicated close glyph would be a design-system change.
  - |
    Retention for rejected and withdrawn candidate data (deferred epic question) is not decided. This plan never deletes candidates, and counts include them as the story says; any retention job is a later story. The other deferred questions (employee record retention, scale and environments) do not affect this story.
  - |
    The Postgres repository can only be exercised against a real database; the standard offline test command has none, so those tests are skipped without `TEST_DATABASE_URL`. The close and count SQL is therefore verified by the in-memory fake in the default run and by the Postgres test only where a database is provided.
  - |
    No pagination, search or filter on the list: the story and prototype show a plain list, and expected volume is unknown.

decisions:
  - decision: Refuse a close with HTTP 409 and a machine-readable body naming the in-progress count
    rationale: |
      A conflict with the opening's current state is what 409 means; the body lets the web show the prototype's "N candidates are still in Applied, Screening, Interview or Offer" message without a second request.
    alternatives:
      - 422 with a validation-style body
      - 400 with a plain message
    durable: true
    scope: api
    status: proposed
    evidence:
      - services/api/app/routers/job_openings.py
  - decision: Enforce the close rule in the API inside a transaction that locks the opening row
    rationale: |
      The rule must hold regardless of the client, and a candidate added between the check and the update must not slip through.
    alternatives:
      - Check in the web client only
      - Count without a lock
    durable: true
    scope: api
    status: proposed
    evidence:
      - services/api/app/repositories/job_openings.py
  - decision: Authorise with a require_hr_admin dependency that reads roles from a configurable claim
    rationale: |
      ADR-0007 requires JWT validation and role-based access control on every API request; the claim name is not fixed by the identity provider setup, so it is configuration.
    alternatives:
      - Hard-code the claim name
      - Call the identity provider per request
    durable: true
    scope: api
    status: follows
    follows_adr: [ADR-0005, ADR-0007]
    evidence:
      - services/api/app/auth.py
  - decision: Use plain SQL migration files with a small runner and raw psycopg queries, with no ORM
    rationale: |
      The API has only psycopg installed and no migration tool; this adds no dependency and keeps the SQL (join count, row lock) explicit.
    alternatives:
      - SQLAlchemy and Alembic
    durable: true
    scope: api
    status: proposed
    evidence:
      - services/api/pyproject.toml
  - decision: Hide status from the edit payload and expose open and close as separate action endpoints
    rationale: |
      AC 2 says edits change details other than status, and the close rule is checked only on the close action; the prototype also changes status only from the list.
    alternatives:
      - One PATCH that accepts status
    durable: false
    scope: api
    status: proposed
    evidence: []
  - decision: Show the opening reference as JO- plus the numeric id, computed in the API response
    rationale: |
      The prototype shows ids like JO-101 in mono type; deriving it avoids storing a second identifier.
    alternatives:
      - Store a separate reference column
    durable: false
    scope: api
    status: proposed
    evidence: []
  - decision: The web page fetches from the API on the client and maps a 403 to the forbidden state
    rationale: |
      The token lives in the browser session, and the API stays the one place that decides who is an HR admin (ADR-0001, ADR-0002); the UI hides nothing on its own.
    alternatives:
      - Server-component fetch
      - Decide the role in the web app from token claims
    durable: false
    scope: web
    status: follows
    follows_adr: [ADR-0001, ADR-0002]
    evidence: []

estimated_points: 8

package_dependencies:
  - name: PyJWT
    version: ">=2.9,<3"
    ecosystem: pip
    rationale: Validate the Auth0 JWT (signature, issuer, audience, expiry) in the API.
    component_id: comp_application_api
  - name: cryptography
    version: ">=43"
    ecosystem: pip
    rationale: Needed by PyJWT for RS256 signature verification and for generating a test signing key.
    component_id: comp_application_api

notes: |
  ### Data & rollout
  - **Existing data**: None existing; migration 0001 only adds the new `job_openings`, `candidates` and `schema_migrations` tables. No existing rows are altered. Added tables have no data to backfill. The candidates story must extend `candidates`.
  - **Backfill / seed**: None needed. The migration runner is idempotent: it skips files already recorded in `schema_migrations`.
  - **Settings**: `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `AUTH_ROLES_CLAIM`, `HR_ADMIN_ROLE` (API) and `NEXT_PUBLIC_API_BASE_URL` (web), documented in the two READMEs. With the issuer, audience or JWKS URL unset, every token is rejected (401), which is the safe default; `HR_ADMIN_ROLE` defaults to `hr_admin`.
  - **Provisioning**: the identity provider must issue an HR admin role and put it in the roles claim; this is outside the repository (open question). The database must exist before `python -m app.migrate` is run.
  - **Order and rollback**: run the migration first, then deploy the API, then the web app. The change is additive; roll back by deploying the previous code and leaving the tables in place (or dropping `job_openings` and `candidates` if nothing else uses them).

  ### Design source
  Read from the approved prototype: screen "Job openings" with `data-layout="table"`; states default, loading (4 `.skeleton` rows), empty ("No job openings yet"), error ("Job openings could not be loaded", "Try again") and forbidden ("Job openings are for HR admins"); table columns Opening, Department, Location, Status, Candidates, Actions; right-aligned Candidates cell with the total and a split line ("N in progress, M finished", or "No candidates yet"); Open badge uses `.badge-success`, Closed uses a plain `.badge`; create/edit drawer with fields Job title, Department, Location, Employment type (Full time, Part time, Contract) and optional Description; close confirmation modal with `.btn-danger` "Close opening" and ghost "Keep open"; toast copy ("Your changes are saved.", "Opening created and open.", "{title} is closed.", "{title} is open."). Narrow viewports (below 820px) stack the table rows with `data-label` captions. No acceptance criterion conflicts with the prototype. The prototype's forbidden state has a "Try to create an opening" button that only demonstrates AC8; it is not carried into production, since the API refusal is covered by tests.

  ### Architecture
  ```mermaid
  flowchart TD
    Page[web: job-openings page] --> Client[web: lib/api/job-openings.ts]
    Client -->|Bearer JWT| Router[api: routers/job_openings.py]
    Router --> Auth[api: auth.py require_hr_admin]
    Router --> Repo[api: repositories/job_openings.py]
    Repo --> DB[(PostgreSQL)]
    Main[api: main.py] --> Router
    Main --> Health[api: routers/health.py]
    Layout[web: app/layout.tsx] --> Globals[web: app/globals.css]
    Globals --> Tokens[design/tokens.css and prototype-utils.css]
    classDef touched fill:#f96,color:#000
    class Page,Client,Router,Auth,Repo,Main,Layout,Globals touched
  ```
  The orange nodes are new or changed in this plan; `routers/health.py`, the design CSS files and PostgreSQL are existing context.

review_focus: |
  IN scope: API auth seam, the openings and minimal candidates tables, five endpoints, and the web page with all prototype states. OUT: candidate and offer features, the Auth0 sign-in flow in the web app, navigation entry, pagination, and data retention. The riskiest area is the close rule (row lock plus the four in-progress stages) and the count query (LEFT JOIN, all stages counted); check both against the Postgres-backed test, not only the in-memory fake. Deliberate: the `candidates` table is minimal because the next story owns it, and status is not editable through PATCH.
