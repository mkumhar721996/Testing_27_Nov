---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: Responsive web interface for end users and administrators; built with
  Next.js 15, TypeScript and Tailwind CSS. Admin screens are shown by role.
kind: web_ui
split_reason: A browser client is a different runtime from the API; one UI serves
  both users and admins.
talks_to:
- component_id: comp_application_api
  interaction: sync
  evidence: users access the platform through a responsive web interface
- component_id: comp_identity_provider
  interaction: sync
  evidence: OAuth 2.0 / JWT-based authentication; managed provider
rule: End-user and admin screens ship in one Web App; admin screens are shown only
  to users with the admin role.
evidence:
- type: human
  ref: 'Frontend Web Application: Next.js 15, TypeScript, Tailwind CSS'
basis: stated
---

## Context

Kept separate because A browser client is a different runtime from the API; one UI serves both users and admins.

Grounded in the person's words ("Frontend Web Application: Next.js 15, TypeScript, Tailwind CSS").

## Decision

**Rule.** End-user and admin screens ship in one Web App; admin screens are shown only to users with the admin role.

Responsive web interface for end users and administrators; built with Next.js 15, TypeScript and Tailwind CSS. Admin screens are shown by role.

## Talks to

- **Application API** (sync) — users access the platform through a responsive web interface
- **Identity Provider** (sync) — OAuth 2.0 / JWT-based authentication; managed provider

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Revisit when

The reason it is kept separate no longer holds (A browser client is a different runtime from the API; one UI serves both users and admins).

## Evidence

Basis: stated.
- human: Frontend Web Application: Next.js 15, TypeScript, Tailwind CSS
