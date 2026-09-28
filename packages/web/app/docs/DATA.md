# Data loading in `console`

How a page's data gets requested, cached and kept fresh, and the recipe for giving a page a loader.
The client is [urql](https://urql.dev) with graphcache (`src/lib/urql.ts`, `src/lib/urql-cache.ts`);
the requests start in [TanStack Router](https://tanstack.com/router) loaders (`src/routes/`), and
pages read them through `useQuery`. Routing itself is in [ROUTER.md](./ROUTER.md).

## Two patterns and one rule

**1. A route loads; a page reads.** A route's loader runs every document its page will read, with
the variables the page will use, through `loadQuery` (`src/lib/route-utils.ts`). The page's
`useQuery` for the same document and variables is then a cache hit, or joins the request still in
flight; it never starts one of its own on a first render. On a cold load every document for the
screen starts in one burst as soon as the router has matched, before anything renders, alongside the
viewer and layout documents. Loader data never carries GraphQL data: the page reads through urql, so
mutations, updaters and revalidation reach it the same way they reach everything else. It carries
only what the loader decided, such as the insights period below.

**2. Warm by default; await only to decide.** A loader `void`s `loadQuery` for what the page shows,
and the page renders at once with its regions behind their own skeletons (`DataTable loading`, the
`Skeleton` primitives, the pages' own loading branches). A loader awaits only when the route must
decide before rendering: a redirect (`/settings` under a target awaits the page document to check
`viewerCanAccessSettings`, each section awaits it to check its own visibility, `/history` awaits the
latest version to redirect to it) or a not-found. While an awaiting loader runs, the router shows
`PagePending`, a centered spinner, after 250 ms (`defaultPendingComponent` and `defaultPendingMs` in
`src/router.ts`); a load that finishes inside the delay never shows it. A warmed document the page turns out not to read
(the stats of a target that has no operations yet) is the accepted cost of not awaiting.

**The rule that makes 1 work: the variables must match.** The loader builds them from `params` and
`loaderDeps` exactly as the page builds them from `useSlugs` and `useSearch`: same shape, same
defaults, and `null` is not `undefined`, because urql keys a request by document and variables.
Anything computed from the URL alone is a pure function both sides call: `buildGraphQLFilter` for
insights, `settingsSections` for the settings routes. Anything that also depends on the clock is
resolved once, by the loader, and returned as loader data: the insights loaders return the period
and resolution from `loaderPeriod` and the page reads them with `useLoaderData`, so a filter change
after the hour rolls over cannot leave the two on different buckets. `loaderDeps` names the search
params a query takes, so a change to one of them re-runs the loader and a change to any other
(`viewId` on insights) does not.

## Request policies

- **`cache-first`**, the default of `loadQuery` and of every page `useQuery`: read once per session
  and kept right by the cache. Renames flow through normalization (mutations return `id` and the
  changed fields); creates and deletes go through updaters in `src/lib/urql-cache.ts`. Layout
  documents, settings, checks and tokens live here.
- **`cache-and-network` in a loader**: show the cache, revalidate on every visit. For data that
  moves on its own, which so far is the insights stats and the operations list. The page still reads
  `cache-first`; a component's own `useQuery` never carries `cache-and-network` under a loader,
  since whichever of the loader's requests lands first would then be revalidated a second time by
  the page.
- **Preloads.** `loader.preload` is true when a hover or focus preload runs the loader
  (`defaultPreload: 'intent'`). A loader that revalidates switches to `cache-first` for it, so a
  hover only warms. The router keeps a preloaded match fresh for 30 s (`defaultPreloadStaleTime`),
  so on a `cache-first` route the click that follows runs no loader and no request. A route that
  revalidates sets `preloadStaleTime: 0`, so the visit that follows a hover still runs its loader;
  the insights routes do.
- **Refresh** is `router.invalidate()`: it re-runs the current matches' loaders, and each loader's
  policy decides what that costs. `useDateRangeController().refreshResolvedRange()` does this, so a
  Refresh button is one call and reloads exactly what its route declared live, recomputing anything
  the loader resolved, such as the insights period. On a page without a loader yet (traces, the
  client and coordinate insights, alerts activity, the explorer pages) the same call only re-runs
  the layout loaders, all cache hits, and the page's own refetch effect still does the work; those
  effects stay until their pages get loaders.
- **`network-only`** after a mutation whose result no updater can write, to re-execute a list.
- An error result is never cached. `loadQuery` resolves with it rather than throwing, the page's
  `useQuery` sees it and renders `QueryError` as before, and a loader redirects only on an explicit
  answer (`viewerCanAccessSettings === false`), never on missing data.

## The viewer and the layouts

- `authenticated.tsx` checks the session in `beforeLoad`, so no loader runs for an anonymous
  visitor.
- The `with-header` route's loader loads `ViewerQuery` (`src/components/layouts/queries.ts`: `me`,
  the organizations tree the selectors read, `isCDNEnabled`) and revalidates it at most once a
  minute (`VIEWER_MAX_AGE_MS`). `useViewer()` reads it anywhere under the header. Joins and member
  removals invalidate it through updaters; changes made by other people appear within a minute plus
  a navigation.
- Each layout route warms its entity document (`OrganizationLayoutQuery`, `ProjectLayoutQuery`,
  `TargetLayoutQuery`: slugs, `viewerCan*`, `latestSchemaVersion.id`, `usageRetentionInDays`). A
  page under it reads the same document through `useLayoutQuery(scope)` instead of selecting those
  fields again, and a loader under it can rely on the same cache: the `/history` redirect is a cache
  read.
- The user menu's own organization document is a cache hit once the layout has answered, because the
  layout document spreads the menu's fragment.
- The client rides in router context (`createAppRouter({ urqlClient })`); a loader reads it as
  `context.urqlClient` and never imports `@/lib/urql`.

## A list owns its connection

A paginated list keeps one query and moves its cursor. The field gets `relayPagination()` in
`cacheOptions.resolvers` (`Target.schemaChecks`, `Target.appDeployments`, `Target.traces`,
`AppDeployment.documents`, the token connections), the list holds `after` in
`useResetState(null, [...filters])`, and the query for the latest cursor reads every page loaded so
far, so "load more" is `setAfter(pageInfo.endCursor)` and a filter change resets the cursor. The
route warms the first page with `after: null` and the filters from `loaderDeps`. The checks side
list (`src/pages/target-checks.tsx`) is the example.

One footgun: the resolver merges every use of the field whose non-cursor arguments match, so a
`first: 1` probe with the same filters reads the merged list, not one item. Read only its emptiness,
or give the probe arguments of its own: the checks probe carries no `filters` while the list always
passes them, so the two never merge.

## Loading states

A spinner marks a wait that promises no shape: a button while it saves, a switch while it flips, and
a route while its awaiting loader decides what the page is (`PagePending` / `SectionPending`,
`src/components/layouts/page-pending.tsx`). A region whose shape is known loads behind a skeleton:
`DataTable loading` renders skeleton rows under the real header, stat cards and lists use the
`Skeleton` primitives. A table whose rows are being replaced keeps them, dimmed (`DataTable
refreshing`, or `sorting.loading` for a sort, which also spins the sorted header's arrow).

The cold-load sequence is: HTML, then nearly all of the app's JavaScript (the route tree imports
every page eagerly; Monaco alone is lazy), then the session gate, then every loader for the matched
routes in one burst, then the first render with each region's skeleton, then the data. Nothing can
start before the route tree has evaluated, which is most of the time to first request in
development; a hover preload moves a route's burst ahead of the click.

## Where things live

```
src/lib/route-utils.ts                    loadQuery(loader, document, variables, policy?), LoaderContext,
                                          revalidate(loader), requireLayoutFlag.<scope>(loader, ...flags),
                                          defaultRange(range, to) for a beforeLoad
src/lib/urql.ts                           the app client: POST only, auth exchange, persisted operations, SSE
src/lib/urql-cache.ts                     cacheOptions: keys, relayPagination resolvers, mutation updaters,
                                          optimistic results; the app client and the test client both use it
src/lib/urql-exchanges/state.ts           the network status behind the progress bar; preloads leave it alone
src/components/layouts/queries.ts         ViewerQuery and the three layout documents
src/lib/hooks/use-layout-query.ts         useLayoutQuery(scope); use-viewer.ts: useViewer()
src/lib/hooks/use-date-range-controller.ts  loaderPeriod(deps, preset) for a loader and its page; Refresh
src/lib/overview-period.ts                overviewPeriod(now?): the overviews' 14-day window as loader data
src/lib/hooks/use-interval.ts             useInterval(ms, fn): a poll that never fires on mount
src/routes/with-header.tsx                the viewer's loader and its freshness stamp
src/routes/<scope>/route.tsx              the layout loaders
src/routes/target/insights.tsx            warm + revalidate, loaderDeps, a beforeLoad default, preload policy
src/routes/target/checks.tsx              warm, loaderDeps on the filters, a child route's own document
src/routes/target/settings.ts             await + redirect, section checks, section documents warmed
src/routes/target/{laboratory,proposals}.tsx  requireLayoutFlag.target(loader, flag)
src/routes/target/alerts.tsx              the gate; activity: default range, loaderDeps, period as loader data,
                                          polled by router.invalidate; rules and detail warm + revalidate
src/routes/target/apps.tsx                loaderDeps on the sort, and on the settled search term; warm beside the gate
src/routes/target/history.tsx             warm + revalidate the list, await + redirect from a cache read
src/lib/testing/urql.ts                   createTestClient on cacheOptions; fixtures/ beside it
```

## Recipes

### Give a page a loader

1. Export the page's documents from the module that declares them (documents stay under
   `src/{components,lib,pages}` for codegen). Note how the page builds each document's variables;
   move anything computed into a pure function the page calls too.
2. On the route, `loaderDeps: ({ search }) => ({ ... })` with the search keys a query takes, then
   `loader: loader => { ... }`: read the slugs from `loader.params`, build the variables, and
   `void loadQuery(loader, Document, variables)` per document. Leave the page's `useQuery` as it is.
3. If a mount-time refetch effect existed, delete it. If the data moves on its own, pass
   `loader.preload ? 'cache-first' : 'cache-and-network'` to those `loadQuery` calls and make the
   page's Refresh call `router.invalidate()`.
4. If the route must redirect on data, `await` that one document and `throw redirect(...)` on an
   explicit answer; the router's pending default covers the wait.
5. Spec, in `src/routes/<scope>/<area>.spec.ts`: `router.load()` at the URL, then the documents are
   in `client.seen` with the loader's variables in `client.operations`; render, then each document
   is requested once, holding a fixture in flight (`new Promise(() => {})`) where the page mounts
   later; a redirect lands in `router.state.location.pathname`.

### Keep a list right after a mutation

Prefer an updater in `src/lib/urql-cache.ts` (`cache.invalidate(entity, field, args)` or
`updateQuery`) over `reexecuteQuery` in the component. A change to fields of an entity the mutation
returns with its `id` needs neither.

### Add a section to the target settings

Add the route under `targetSettingsRoute` with `loader: loader => loadSection(loader, 'thing')`,
warming the section's own document first; add the section to the `sections` table and to
`settingsSections` under its permission (`src/pages/target-settings.tsx`). The nav and the loaders
agree through that function.

## Testing

Run from the repo root: `pnpm vitest run packages/web/app/src`.

| Spec                                  | Guards                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/target/insights.spec.ts`      | The loader's variables and policies before render; one request per document with the page mounted; Refresh on both pages; the bare URL's default range; the period resolved once across an hour boundary; a hover warms and the visit revalidates; rows don't preload. |
| `routes/target/checks.spec.ts`        | Load more merges pages; a filter change starts over and keeps the selected check; the loaders' variables; one request per document; rows don't preload.                                                                                                                |
| `routes/target/alerts.spec.ts`        | The bare URL's default range; retention and the log started together with the loader's period; the poll repeats the bounds within a minute and moves them at the roll; rules and detail revalidate their configuration and leave the state log to the page; the create form's three documents. |
| `routes/target/traces.spec.ts`        | The trace loader's variables; the error branch before not-found. |
| `routes/target/history.spec.ts`       | The list's next page merges into the same list; the loaders' variables; one request per document; a revisit revalidates the list alone; the version pane shows an error before not-found. |
| `routes/render.spec.ts`               | The layout loaders' variables; the settings redirects and the page document requested once; hover preloading; the history redirect as a cache read; failed page queries show the error; a CDN create refetches the open page.                                          |
| `routes/target/settings-cdn.spec.tsx` | The one spec on the app's own client, exchanges and all: a CDN create through the modal refetches the open page.                                                                                                                                                       |
| `lib/urql-cache.spec.ts`              | The updaters against a stub cache, and the CDN updaters through the real cache.                                                                                                                                                                                        |
| `router.spec.ts`                      | The pending defaults and `defaultPreload`.                                                                                                                                                                                                                             |
| `lib/testing/urql.spec.ts`            | The test client answers by operation name, records variables and context, holds promise fixtures, and fails a fixture that no longer covers its document.                                                                                                              |

`createTestClient(fixtures)` (`src/lib/testing/urql.ts`) is a client on the app's own graphcache
configuration whose network is a lookup by operation name. `seen` and `operations` are the requests
that reached the network, and `requests(name)` narrows them to one document: a cache hit is absent,
the network leg of a `cache-and-network` hit arrives as `network-only`, and an invalidated or
partial read arrives again. A spec asserts variables, policies and the `preload` flag on them. A
promise fixture holds its request in flight until it settles, which is how a spec proves a page
joined the loader's request; an `Error` fixture answers as a failed request. The env, laboratory and
SuperTokens stand-ins live in `src/lib/testing/mocks/`, one `vi.mock` line each in the spec, since
there is no app-scoped vitest project to hold `setupFiles`. Fixtures (`src/lib/testing/fixtures/`)
carry `__typename` on every object below the root, as the server would, and are checked against the
document they answer: a missing field, including a typename, fails with its path named. No fake
timers, except the clock alone (`vi.useFakeTimers({ toFake: ['Date'] })`) when a case needs time to
move: timers, the router and `waitFor` stay real.
