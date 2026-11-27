# ADR Index

One line per decision — the rule, not the reasoning. Read the full ADR (`.arc/decisions/ADR-NNNN-*.md`) for context and rationale.

## Accepted — binding rules

| ADR | Category | Status | Rule |
|---|---|---|---|
| ADR-0001 | component | accepted | End-user and admin screens ship in one Web App; admin screens are shown only to users with the admin role. |
| ADR-0002 | component | accepted | All Web App reads and writes go through the Application API, which enforces role checks on admin operations. |
| ADR-0003 | component | accepted | Only the Application API reads or writes the Relational Database. |
| ADR-0004 | component | accepted | Only the Application API uses the Cache, and nothing stored there is the sole copy of persistent data. |
| ADR-0005 | component | accepted | Sign-in and token issuing are done only by the managed Identity Provider; the Application API only validates its tokens. |
| ADR-0006 | deployment_target | accepted | The Web App, Application API, Relational Database and Cache run as containers in AWS eu-central-1 only. |
| ADR-0007 | cross_cutting | accepted | Every Application API request is authenticated by a valid JWT and authorised by role-based access control. |
