<!-- arc:generated facts=c7c65f13fea3a766 template=1 -->

<!-- arc:generated:start section=commands hash=d421c65f81b5 -->
# Commands
- Setup (runs on every sync): `(cd apps/web && pnpm install --frozen-lockfile) && (cd services/api && uv sync)`
- Test: `(cd services/api && uv run --no-sync --offline pytest) && (cd apps/web && pnpm test)`
- Quick check while working: `(cd services/api && uv run --no-sync --offline ruff check . && uv run --no-sync --offline pytest -q) && (cd apps/web && pnpm devloop)`
- Build: `(cd services/api && sh scripts/build.sh) && (cd apps/web && pnpm build)`
<!-- arc:generated:end -->

<!-- arc:generated:start section=definition-of-done hash=608a98a33c4f -->
# Definition of done
- `(cd services/api && uv run --no-sync --offline ruff check . && uv run --no-sync --offline pytest -q) && (cd apps/web && pnpm devloop)` and `(cd services/api && uv run --no-sync --offline pytest) && (cd apps/web && pnpm test)` pass.
<!-- arc:generated:end -->

# Conventions
<!-- Only rules that differ from the default, each a sentence a reviewer can check. -->
- Use pnpm in `apps/web` and uv in `services/api`; do not add npm or pip installs or lockfiles.

# Gotchas
<!-- Misleading code, generated files, env vars, steps that must run in order. -->
- `docs/decisions/ADR-INDEX.md` is listed as the ADR index but is not present in the repository, so do not assume it exists.

<!-- arc:generated:start section=pointers hash=d46b0120faf8 -->
# Pointers
- Commands and components: `.arc/config/setup.yaml`
- UI guidelines: `apps/web/design/UI-GUIDELINES.md`
<!-- arc:generated:end -->
