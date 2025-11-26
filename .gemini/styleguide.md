# Gemini Code Assistant – Style Guide

## General

Focus: Correctness and Performance \
Tone: In your review, be concise, direct and to the point.

- DO NOT include a preamble or postamble.
- DO NOT repeat the PR description. Assume other reviewers read the PR from the top and they've
  already seen it.
- DO NOT introduce yourself.

## Frontend / UI

Scope: UI code, both React + TypeScript and CSS \

Rules:

- avoid setting state from useEffect instead of deriving it
- prefer single long className over `cn/clsx` for non-conditional styles
- be aware of modern React, but don't force it
  - `useSyncExternalStore` for external state
  - `useDeferredValue` for non-urgent updates
  - Transition APIs for expensive renders
- do not ponder on what's "generally best", analyze the codebase and PR as it is

Guidelines:

- keystroke cost: prefer uncontrolled inputs; make controlled loops cheap
- preload wisely: preload only above-the-fold images; lazy-load the rest

## Backend

Scope: Backend code, testing, and tooling

### Best Practices

These are things we want to encourage where it makes sense to avoid headaches in the future.

#### Integration Testing

Adding new functionality to the GraphQL API or another service should come with a set of integration
tests within `/integration-tests` for testing that new component/functionality.

We encourage avoiding testing low-level functionality (e.g., querying the database) if the
functionality can also be verified at a high level (e.g., retrieving the database data via an API
call). For critical features, it is acceptable to test low-level database in output in addition to
high-level output.

#### I/O and Configuration

- Do not access `process.env` directly in your code.
- Define environment variables in `packages/services/*/src/environment.ts` using Zod schemas
- Parse and validate database results or network HTTP calls to services/third-party services using
  Zod schemas.
- Avoid using `fetch` or `node-fetch` directly, as it does not have built-in retries

### Anti Patterns

#### Adding new major logic to `/packages/services/storage`

This module is considered legacy. Instead, we now have smaller classes within the corresponding
GraphQL modules that hold the logic for interacting with Postgres.

It is acceptable to alter existing implementations and fix bugs, but adding methods here when
introducing new database tables is discouraged.

## Releasing

We use changesets for versioning.

- Pull requests touching the Hive SDKs need to have a changeset (`/packages/libraries`) for the
  corresponding scope.
  - The changeset should describe the introduced changes, providing an overview of new API options.
  - If needed: Provide examples for migrating from deprecated API options to newly introduced API
    options.
- Pull requests touching the services, migrations, or the dashboard (`/packages/migrations`,
  `/packages/services`, `/packages/web/app`, `/docker`) should have a changeset for the `hive`
  scope.
  - These changesets should have the right amount of informational content for someone to understand
    what this change introduces for their self-hosted Hive instance, without going into too much
    internal technical detail.
