---
id: ADR-0005
category: component
title: Identity Provider
status: accepted
superseded_by: null
component_id: comp_identity_provider
responsibility: Managed identity provider that signs users and admins in and issues
  OAuth 2.0 / JWT tokens carrying their roles; runs on Auth0.
kind: managed_service
split_reason: A provider-run service the project uses but does not build.
rule: Sign-in and token issuing are done only by the managed Identity Provider; the
  Application API only validates its tokens.
evidence:
- type: human
  ref: Auth0
basis: stated
---

## Context

Kept separate because A provider-run service the project uses but does not build.

Grounded in the person's words ("Auth0").

## Decision

**Rule.** Sign-in and token issuing are done only by the managed Identity Provider; the Application API only validates its tokens.

Managed identity provider that signs users and admins in and issues OAuth 2.0 / JWT tokens carrying their roles; runs on Auth0.

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Revisit when

The reason it is kept separate no longer holds (A provider-run service the project uses but does not build).

## Evidence

Basis: stated.
- human: Auth0
