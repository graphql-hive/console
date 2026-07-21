# Hive Laboratory

[Hive](https://the-guild.dev/graphql/hive) is a fully open-source schema registry, analytics,
metrics and gateway for [GraphQL federation](https://the-guild.dev/graphql/hive/federation) and
other GraphQL APIs.

`@graphql-hive/laboratory` is Hive's embeddable, in-browser GraphQL IDE (the "Lab"): an editor and
runner for GraphQL operations, in the spirit of GraphiQL. It powers the Laboratory page inside the
Hive Console and can be embedded into any page that talks to a GraphQL endpoint.

> **Pre-1.0.** The public API (see [`LaboratoryApi`](src/components/laboratory/context.tsx)) is
> still evolving and can change between patch releases.

## Features

- Query builder: click schema fields/arguments to build the operation
- Schema explorer with search (list and tree modes)
- Collections (saved operations) and request history
- Preflight scripts: run JavaScript before a request in a sandboxed Web Worker
- Environment variables with `{{variable}}` interpolation
- Renders a federation query plan when a server includes one in the response `extensions`
  (`extensions.queryPlan`), e.g. [Hive Router](https://the-guild.dev/graphql/hive/docs/router) or
  Hive Gateway
- Plugin system for adding tabs, command-palette entries and preflight APIs

## Consumers

This package is storage- and transport-agnostic. It exposes state as props and reports changes via
callbacks; the host decides where data lives.

- **Hive Console** (`packages/web/app`) embeds the `<Laboratory>` React component directly in
  [`target-laboratory-new.tsx`](../../web/app/src/pages/target-laboratory-new.tsx) and wires the
  callbacks to the Hive GraphQL API and `localStorage`.
- **Hive Gateway** serves the Lab as its GraphiQL replacement via
  **`@graphql-hive/render-laboratory`** ([`../render-laboratory`](../render-laboratory)), which
  wraps this package's UMD bundle plus the Monaco workers into a self-contained HTML page for
  `graphql-yoga` servers.
- **Hive Router** embeds this package's UMD bundle (`dist/hive-laboratory.umd.js`) directly at build
  time, generating a static page that calls the `HiveLaboratory.renderLaboratory()` global.

## Installation

```bash
pnpm add @graphql-hive/laboratory
```

## Usage

Two entry points are exported from [`src/index.tsx`](src/index.tsx):

**`renderLaboratory(el, props)`** mounts the Lab into a DOM node and wires all state to
`localStorage` for you. This is the quickest way to embed it:

```ts
import { renderLaboratory } from '@graphql-hive/laboratory'

renderLaboratory(document.getElementById('root')!, {
  defaultEndpoint: 'https://example.com/graphql'
})
```

**`<Laboratory />`** is the React component when you want to own persistence. Every piece of state
follows the same controlled/uncontrolled contract: a `defaultX` prop seeds the initial value and an
`onXChange` callback fires whenever it changes.

```tsx
import { Laboratory } from '@graphql-hive/laboratory'

function LabPage() {
  return (
    <Laboratory
      theme="dark"
      defaultEndpoint={endpoint}
      onEndpointChange={setEndpoint}
      defaultCollections={collections}
      onCollectionsChange={saveCollections}
      defaultHistory={history}
      onHistoryChange={saveHistory}
      // ...tabs, operations, env, preflight, settings, plugins
    />
  )
}
```

The full prop surface (endpoint, collections, operations, history, tabs, env, preflight, settings,
tests, plugins, plus granular `onXCreate`/`onXUpdate`/`onXDelete` callbacks and a `permissions`
object) is defined by [`LaboratoryApi`](src/components/laboratory/context.tsx). Treat that interface
as the source of truth rather than this README.

### Permissions

Pass a `permissions` object to gate actions per resource (`preflight`, `collections`,
`collectionsOperations`) with `read`/`create`/`update`/`delete` flags. Gating is applied in the UI
(controls are hidden/disabled) with a backstop in the operations logic; anything unspecified
defaults to allowed.

### Styling and rendering

The Lab bundles its own styles and injects them into its shadow root, so there is no CSS file to
import. It is client-side only (it uses Web Workers, Shadow DOM and Monaco), so mount it in the
browser rather than during server-side rendering.

## Local development

```bash
pnpm dev   # Vite dev server on http://localhost:5173
pnpm build # library build (ES + CJS) and UMD build
pnpm lint  # eslint
```

`pnpm dev` mounts the Lab via [`src/main.tsx`](src/main.tsx) / [`index.html`](index.html), a thin
harness that persists all state to `localStorage`. No backend is required; set an endpoint in the UI
and go.

Tests run from the monorepo root (this package has no `test` script):

```bash
# from the repo root
pnpm vitest run packages/libraries/laboratory
```

## Architecture

Each feature is a `useX` hook (state + actions) under [`src/lib`](src/lib), paired with a component
under [`src/components/laboratory`](src/components/laboratory). All the hooks are composed into one
context in [`laboratory.tsx`](src/components/laboratory/laboratory.tsx) and consumed via
`useLaboratory()`.

| Feature                         | Hook (`src/lib`)                       | UI (`src/components/laboratory`)  |
| ------------------------------- | -------------------------------------- | --------------------------------- |
| Endpoint + schema introspection | `endpoint.ts`                          | (implicit)                        |
| Operations + run/abort          | `operations.ts`, `operations.utils.ts` | `operation.tsx`, `builder.tsx`    |
| Collections                     | `collections.ts`                       | `collections.tsx`                 |
| History                         | `history.ts`                           | `history.tsx`, `history-item.tsx` |
| Preflight scripts               | `preflight.ts`                         | `preflight.tsx`                   |
| Environment variables           | `env.ts`                               | `env.tsx`                         |
| Settings                        | `settings.ts`                          | `settings.tsx`                    |
| Tabs                            | `tabs.ts`                              | `tabs.tsx`                        |
| Query plan                      | `query-plan/`                          | `flow.tsx`                        |

### Style isolation (Shadow DOM)

Because the Lab is embedded into pages it does not control, it renders inside a Shadow DOM
(`ShadowRootContainer` in [`laboratory.tsx`](src/components/laboratory/laboratory.tsx)) and injects
its CSS (Tailwind v4) plus Monaco's CSS inline. This gives two-way isolation from the host page's
styles. A consequence worth knowing: Radix portals (dropdowns, tooltips, dialogs) must target the
Lab's `container` (exposed on the context) rather than `document.body`, or they render unstyled.

The UI is built on shadcn/Radix primitives ([`src/components/ui`](src/components/ui)), Monaco, and
`@tanstack/react-form`.

## Plugins

A plugin can add tabs, command-palette commands, and objects injected into the preflight sandbox.
See [`LaboratoryPlugin`](src/lib/plugins.ts) for the shape and
[`src/plugins/target-env.tsx`](src/plugins/target-env.tsx) for a worked example (the Target
Environment plugin used by Hive Console). Register plugins via the `plugins` prop.

## Releases

This package is published to npm via [Changesets](https://github.com/changesets/changesets) from the
monorepo:

1. Add a changeset from the repo root: `pnpm changeset` (pick `@graphql-hive/laboratory`, choose the
   bump, write the summary that becomes the changelog entry).
2. Opening a PR publishes an `alpha` snapshot to npm for testing.
3. Merging to `main` accumulates changes into an "Upcoming Release Changes" PR.
4. Merging that PR versions the package and publishes it to npm.

See [`CHANGELOG.md`](CHANGELOG.md) for release history.

## License

Licensed under the [MIT License](LICENSE).
