---
id: ADR-0006
category: deployment_target
title: 'Deployment target: AWS region eu-central-1 (single region), running the Web
  App, Application API'
status: accepted
superseded_by: null
component_id: null
rule: The Web App, Application API, Relational Database and Cache run as containers
  in AWS eu-central-1 only.
decision: AWS region eu-central-1 (single region), running the Web App, Application
  API, Relational Database and Cache as containers; Identity Provider is Auth0 (managed
  SaaS).
evidence:
- type: human
  ref: AWS container; eu-central-1
basis: stated
---

## Context

Grounded in the person's words ("AWS container; eu-central-1").

## Decision

**Rule.** The Web App, Application API, Relational Database and Cache run as containers in AWS eu-central-1 only.

AWS region eu-central-1 (single region), running the Web App, Application API, Relational Database and Cache as containers; Identity Provider is Auth0 (managed SaaS).

## Revisit when

The deployment target or its hosting constraints change.

## Evidence

Basis: stated.
- human: AWS container; eu-central-1
