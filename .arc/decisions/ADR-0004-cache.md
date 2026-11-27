---
id: ADR-0004
category: component
title: Cache
status: accepted
superseded_by: null
component_id: comp_cache
responsibility: Caching, session management and performance optimisation for the Application
  API; runs on Redis.
kind: infrastructure
split_reason: Backing service the project runs itself (Redis) for caching and sessions.
rule: Only the Application API uses the Cache, and nothing stored there is the sole
  copy of persistent data.
evidence:
- type: human
  ref: 'Cache Layer: Redis for caching, session management, and performance optimization'
basis: stated
---

## Context

Kept separate because Backing service the project runs itself (Redis) for caching and sessions.

Grounded in the person's words ("Cache Layer: Redis for caching, session management, and performance optimization").

## Decision

**Rule.** Only the Application API uses the Cache, and nothing stored there is the sole copy of persistent data.

Caching, session management and performance optimisation for the Application API; runs on Redis.

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Revisit when

The reason it is kept separate no longer holds (Backing service the project runs itself (Redis) for caching and sessions).

## Evidence

Basis: stated.
- human: Cache Layer: Redis for caching, session management, and performance optimization
