---
id: ADR-0002
category: component
title: Application API
status: accepted
superseded_by: null
component_id: comp_application_api
responsibility: Backend REST API for business logic and data access, built with FastAPI
  (Python); validates JWTs and enforces role-based access control.
kind: api_service
split_reason: The web client needs a server-side runtime that owns the data and authorization.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: API owns persistent application data
- component_id: comp_cache
  interaction: sync
  evidence: Redis for caching, session management
- component_id: comp_identity_provider
  interaction: sync
  evidence: JWT-based authentication; managed provider
rule: All Web App reads and writes go through the Application API, which enforces
  role checks on admin operations.
evidence:
- type: human
  ref: 'Backend API Service: FastAPI (Python), RESTful APIs for business logic and
    data access'
basis: stated
---

## Context

Kept separate because The web client needs a server-side runtime that owns the data and authorization.

Grounded in the person's words ("Backend API Service: FastAPI (Python), RESTful APIs for business logic and data access").

## Decision

**Rule.** All Web App reads and writes go through the Application API, which enforces role checks on admin operations.

Backend REST API for business logic and data access, built with FastAPI (Python); validates JWTs and enforces role-based access control.

## Talks to

- **Relational Database** (sync) — API owns persistent application data
- **Cache** (sync) — Redis for caching, session management
- **Identity Provider** (sync) — JWT-based authentication; managed provider

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Revisit when

The reason it is kept separate no longer holds (The web client needs a server-side runtime that owns the data and authorization).

## Evidence

Basis: stated.
- human: Backend API Service: FastAPI (Python), RESTful APIs for business logic and data access
