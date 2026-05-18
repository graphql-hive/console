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

---

## Pull Request Reviewing

### What to Look For

Code that looks wrong in isolation may be correct given surrounding logic—and vice versa. Read the
full file to understand existing patterns, control flow, and error handling.

**Bugs** - Your primary focus.

- Logic errors, off-by-one mistakes, incorrect conditionals
- If-else guards: missing guards, incorrect branching, unreachable code paths
- Edge cases: null/empty/undefined inputs, error conditions, race conditions
- Security issues: injection, auth bypass, data exposure
- Broken error handling that swallows failures, throws unexpectedly or returns error types that are
  not caught.

**Structure** - Does the code fit the codebase?

- Does it follow existing patterns and conventions?
- Are there established abstractions it should use but doesn't?
- Excessive nesting that could be flattened with early returns or extraction

**Performance** - Only flag if obviously problematic.

- O(n²) on unbounded data, N+1 queries, blocking I/O on hot paths

**Behavior Changes** - If a behavioral change is introduced, raise it (especially if it's possibly
unintentional).

---

### Before You Flag Something

**Be certain.** If you're going to call something a bug, you need to be confident it actually is
one.

- Only review the changes - do not review pre-existing code that wasn't modified
- Don't flag something as a bug if you're unsure - investigate first
- Don't invent hypothetical problems - if an edge case matters, explain the realistic scenario where
  it breaks
- If you need more context to be sure, use the tools below to get it

**Don't be a zealot about style.** When checking code against conventions:

- Verify the code is _actually_ in violation. Don't complain about else statements if early returns
  are already being used correctly.
- Some "violations" are acceptable when they're the simplest option.
- Excessive nesting is a legitimate concern regardless of other style choices.
- Don't flag style preferences as issues unless they clearly violate established project
  conventions.
