---
id: ADR-0007
category: cross_cutting
title: 'Cross-cutting: Authentication and authorization'
status: accepted
superseded_by: null
component_id: null
rule: Every Application API request is authenticated by a valid JWT and authorised
  by role-based access control.
decision: Authentication uses OAuth 2.0 with JWT access tokens; the Application API
  validates every token and enforces role-based access control (user vs admin).
evidence:
- type: human
  ref: OAuth 2.0 / JWT-based authentication and role-based access control
basis: stated
---

## Context

Grounded in the person's words ("OAuth 2.0 / JWT-based authentication and role-based access control").

## Decision

**Rule.** Every Application API request is authenticated by a valid JWT and authorised by role-based access control.

Authentication uses OAuth 2.0 with JWT access tokens; the Application API validates every token and enforces role-based access control (user vs admin).

## Revisit when

What this decision rests on, named under Evidence, changes.

## Evidence

Basis: stated.
- human: OAuth 2.0 / JWT-based authentication and role-based access control
