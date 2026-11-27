---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Persistent storage for application data, configuration and user records;
  runs on PostgreSQL.
kind: infrastructure
split_reason: Persistent application data is a backing service the project uses but
  does not build.
rule: Only the Application API reads or writes the Relational Database.
evidence:
- type: human
  ref: 'Database: PostgreSQL for persistent data storage'
basis: stated
---

## Context

Kept separate because Persistent application data is a backing service the project uses but does not build.

Grounded in the person's words ("Database: PostgreSQL for persistent data storage").

## Decision

**Rule.** Only the Application API reads or writes the Relational Database.

Persistent storage for application data, configuration and user records; runs on PostgreSQL.

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Revisit when

The reason it is kept separate no longer holds (Persistent application data is a backing service the project uses but does not build).

## Evidence

Basis: stated.
- human: Database: PostgreSQL for persistent data storage
