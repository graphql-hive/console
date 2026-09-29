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
only what the loader decided, such as a resolved period.

**2. Warm by default; await only to decide.** A loader `void`s `loadQuery` for what the page shows,
and the page renders at once with its regions behind their own loading states. A loader awaits only
when the route must decide before rendering: a permission gate (`requireLayoutFlag`, below), a
section check (`/settings` and `/members` await their page document to see which sections the
viewer may open), a data redirect (`/history` awaits the latest version to redirect to it) or a
not-found. Everything else the route warms starts beside the await, so a cold load pays no extra
round trip for the decision. While an awaiting loader runs, the router shows `PagePending`, a
centered spinner, after 250 ms (`defaultPendingComponent` and `defaultPendingMs` in `src/router.ts`);
a load that finishes inside the delay never shows it. A warmed document the page turns out not to
read (the stats of a target that has no operations yet, the unused schema of a target without usage)
is the accepted cost of not awaiting.

**The rule that makes 1 work: the variables must match.** The loader builds them from `params` and
`loaderDeps` exactly as the page builds them from `useSlugs` and `useSearch`: same shape, same
defaults, and `null` is not `undefined`, because urql keys a request by document and variables.
Anything computed from the URL alone is a pure function both sides call, exported from the page:
`buildGraphQLFilter` for insights, `tracesPageVariables`, `appsVariables`, `proposalsVariables`,
`versionsPageVariables`, and the `*Sections` functions of the settings and members pages. Anything
that also depends on the clock is resolved once, by the loader, and returned as loader data: the
period pages return `{ period, resolution }` from `loaderPeriod` and the overviews return
`overviewPeriod()`, and the page reads them with `useLoaderData`, so a filter change after the hour
rolls over cannot leave the two on different buckets. `loaderDeps` names the search params a query
takes, so a change to one of them re-runs the loader and a change to any other (`viewId` on
insights) does not. A search param that changes on every keystroke does not belong in the URL
until it settles: the app version's search box writes the URL 500 ms after typing pauses
(`src/components/apps/app-filter.tsx`), so the loader runs once per pause.

## Request policies

- **`cache-first`**, the default of `loadQuery` and of every page `useQuery`: read once per session
  and kept right by the cache. Renames flow through normalization (mutations return `id` and the
  changed fields); creates and deletes go through updaters in `src/lib/urql-cache.ts`. Layout
  documents, settings pages, checks, apps, project alerts and the read-once target pages live here.
- **`cache-and-network` in a loader** (`revalidate(loader)`): show the cache, revalidate on every
  visit. For data that moves on its own: usage (insights, traces, the explorer views, the overviews,
  alert activity) and lists other people change (history, proposals, alert rules, groups, tokens,
  SSO). The page still reads `cache-first`; a component's own `useQuery` never carries
  `cache-and-network` under a loader, since whichever of the loader's requests lands first would
  then be revalidated a second time by the page.
- **Preloads.** `loader.preload` is true when a hover or focus preload runs the loader
  (`defaultPreload: 'intent'`). `revalidate` switches to `cache-first` for it, so a hover only
  warms. The router keeps a preloaded match fresh for 30 s (`defaultPreloadStaleTime`), so on a
  `cache-first` route the click that follows runs no loader and no request. A route that
  revalidates sets `preloadStaleTime: 0`, so the visit that follows a hover still runs its loader.
- **Refresh** is `router.invalidate()`: it re-runs the current matches' loaders, and each loader's
  policy decides what that costs. `useDateRangeController().refreshResolvedRange()` does this, so a
  Refresh button is one call and reloads exactly what its route declared live, recomputing anything
  the loader resolved, such as the period. A poll is the same call on a timer: alert activity runs
  `useInterval(15 s, () => router.invalidate())` (`src/lib/hooks/use-interval.ts`, which never fires
  on mount, since the loader already ran); within a minute the loader's variables repeat and the
  request revalidates, at the roll they change and the page joins the new request.
- **`network-only`** after a mutation whose result no updater can write, to re-execute a list, and
  always explicit: `reexecuteQuery({ requestPolicy: 'network-only' })`. A bare `reexecuteQuery()`
  takes the hook's policy, which is `cache-first` under a loader, and reads the cache. The proposal's
  changes document is the one page-owned `network-only` query, for the partial-result trouble its
  comment describes.
- An error result is never cached. `loadQuery` resolves with it rather than throwing, the page's
  `useQuery` sees it and renders `QueryError` as before, and a loader redirects only on an explicit
  answer, never on missing data.

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
  fields again (the explorer reads its retention there), and a loader under it can rely on the same
  cache: the `/history` redirect is a cache read, and every permission gate is.
- The user menu's own organization document is a cache hit once the layout has answered, because the
  layout document spreads the menu's fragment.
- The client rides in router context (`createAppRouter({ urqlClient })`); a loader reads it as
  `context.urqlClient` and never imports `@/lib/urql`.

## Gates and defaults in the route

- **Permission gates** are `await requireLayoutFlag.<scope>(loader, ...flags)`
  (`src/lib/route-utils.ts`): the scope's layout document, which the layout route above already
  started, so a cold load dedups into that request and a navigation is a cache hit. It redirects to
  the scope root only when every listed flag is explicitly `false`; missing data or an error admits,
  and the page shows the error. The page documents start beside the gate, not after it, so a viewer
  without the flag may cause one request the server refuses; a viewer with it saves a round trip.
  Target alerts, apps, laboratory and proposals, and project alerts, gate this way.
- **Section checks** (`/settings` under each scope, `/members`) await their page document and
  redirect a hidden section to the first visible one, else the scope root, through the page's
  exported `*Sections(entity)` function, which the nav also renders from. The project settings and
  members pages put a layout-flag gate beside the page document as well.
- **A period lives in the URL.** `defaultRange(range, to)` is the `beforeLoad` that sends a bare URL
  to its default range, so a shared link always says what it shows: the last week for insights,
  traces and the explorer, the last hour for alert activity. The explorer's default is a function,
  the preset last picked on any of its four views (`src/components/target/explorer/period.ts`,
  over localStorage); the URL is the state and storage only remembers. Client, coordinate and
  operation insights default in `loaderDeps` without a redirect.
- **Stripe** decides in `beforeLoad` too: the subscription routes redirect to the organization when
  it is not configured.

## A list owns its connection

A paginated list keeps one query and moves its cursor. The field gets `relayPagination()` in
`cacheOptions.resolvers` (`Target.schemaChecks`, `Target.schemaVersions`, `Target.appDeployments`,
`Target.traces`, `AppDeployment.documents`, `Organization.groups`, `Member.accessTokens` and the
other token connections), the list holds `after` in `useResetState(null, [...filters])`, and the
query for the latest cursor reads every page loaded so far, so "load more" is
`setAfter(pageInfo.endCursor)` and a filter change resets the cursor. The route warms the first page
with `after: null` and the filters from `loaderDeps`. The checks side list (`src/pages/target-checks.tsx`)
and the history list are the examples; the tokens and groups tables page through `usePagedConnection`
over the same merged connection.

Two fields deliberately have no resolver. `Organization.members` pages with previous and next, so
each page replaces the last. `affectedAppDeployments` is read by the affected deployments page at
`first: 20` and by the check page's preview at `first: 5` under the same filters, and a resolver
would merge the two. One more footgun: the resolver merges every use of a field whose non-cursor
arguments match, so a `first: 1` probe with the same filters reads the merged list, not one item.
Read only its emptiness, or give the probe arguments of its own: the checks probe carries no
`filters` while the list always passes them, so the two never merge. And a connection with no cursor
arguments (`schemaProposals`) is the whole list; a "load more" over it only repeats the request.

## Loading states

A spinner marks a wait that promises no shape: a button while it saves, a switch while it flips, and
a route while its awaiting loader decides what the page is (`PagePending` / `SectionPending`,
`src/components/layouts/page-pending.tsx`). A region whose shape is known loads behind a skeleton:
`DataTable loading` renders skeleton rows under the real header, stat cards and lists use the
`Skeleton` primitives. A table whose rows are being replaced keeps them, dimmed (`DataTable
refreshing`, or `sorting.loading` for a sort, which also spins the sorted header's arrow); the page
keeps the last settled rows through `useKeepPreviousData` and passes them while the new ones load.

A page's first result can be a partial cache hit: the layout document already cached the
organization, project or target the page selects, so graphcache answers with those fields, the
missing ones `null`, and `stale: true`, while the request runs. Decide a loading state on the field
the page needs, not on the entity (`!data?.organization?.me?.accessTokens`, not
`!data?.organization?.me`), and treat a stale partial as loading (`fetching || stale`), or an empty
state flashes before the list arrives. A sort or search change has the same shape: the entity is
cached, the new connection is not.

The cold-load sequence is: HTML, then nearly all of the app's JavaScript (the route tree imports
every page eagerly; Monaco alone is lazy), then the session gate, then every loader for the matched
routes in one burst, then the first render with each region's loading state, then the data. Nothing
can start before the route tree has evaluated, which is most of the time to first request in
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
src/lib/hooks/use-date-range-controller.ts  loaderPeriod(deps, preset) for a loader and its page; the picker's
                                          controller and Refresh
src/lib/overview-period.ts                overviewPeriod(now?): the overviews' 14-day window as loader data
src/lib/hooks/use-interval.ts             useInterval(ms, fn): a poll that never fires on mount
src/components/layouts/page-pending.tsx   PagePending (the router's pending default) and SectionPending
src/components/target/explorer/period.ts  the explorer's remembered preset, for its bare URL
src/components/apps/app-filter.tsx        the app version's search term, written to the URL once it settles
src/routes/with-header.tsx                the viewer's loader and its freshness stamp
src/routes/<scope>/route.tsx              the layout loaders; the overviews (overviewPeriod as loader data, revalidate),
                                          support, subscription (a Stripe beforeLoad), project alerts (warm + gate)
src/routes/<scope>/settings.ts            await + section checks over the page's *Sections function; section
                                          documents warmed, tokens and SSO revalidating; project adds a layout gate
src/routes/organization/members.ts        the layout gate beside the page document; membersSections; the list's
                                          filter as loaderDeps; groups by slug, revalidating
src/routes/target/route.tsx               the target layout loader; the schema tab warmed
src/routes/target/insights.tsx            default range, loaderDeps, period as loader data, warm + revalidate;
                                          operation, client and coordinate the same without the redirect
src/routes/target/checks.tsx              warm, loaderDeps on the filters, a child route's own document
src/routes/target/history.tsx             warm + revalidate the list, await + redirect from a cache read
src/routes/target/explorer.tsx            a beforeLoad default from the remembered preset, loaderDeps on the range,
                                          period as loader data, warm + revalidate, the gates
src/routes/target/traces.tsx              default range, loaderDeps on filter + sort + range, period as loader data,
                                          warm + revalidate; the trace detail warmed
src/routes/target/alerts.tsx              the gate; activity: default range, loaderDeps, period as loader data,
                                          polled by router.invalidate; rules and detail warm + revalidate
src/routes/target/apps.tsx                loaderDeps on the sort, and on the settled search term; warm beside the gate
src/routes/target/proposals.tsx           the gate; list and proposal warm + revalidate beside it, loaderDeps on the
                                          stage filter and on version + ts
src/routes/target/laboratory.tsx          the gate alone
src/lib/testing/urql.ts                   createTestClient on cacheOptions; fixtures/ and mocks/ beside it
```

## Recipes

### Give a page a loader

1. Export the page's documents from the module that declares them (documents stay under
   `src/{components,lib,pages}` for codegen). Note how the page builds each document's variables;
   move anything computed into a pure function the page calls too, and export it.
2. On the route, `loaderDeps: ({ search }) => ({ ... })` with the search keys a query takes, then
   `loader: loader => { ... }`: read the slugs from `loader.params`, build the variables, and
   `void loadQuery(loader, Document, variables)` per document. Leave the page's `useQuery` as it is,
   minus any request policy.
3. If a mount-time refetch effect existed, delete it. If the data moves on its own, pass
   `revalidate(loader)` to those `loadQuery` calls, set `preloadStaleTime: 0` on the route, and make
   the page's Refresh call `router.invalidate()`.
4. If the route must decide, `await` that one thing: `requireLayoutFlag.<scope>(loader, flag)` for
   a permission, the page document for a section check, `throw redirect(...)` on an explicit answer.
   Start the page documents before the await, not after it.
5. Spec, in `src/routes/<scope>/<area>.spec.ts`: `router.load()` at the URL, then the documents are
   in `client.requests(name)` with the loader's variables and policy; render, then each document is
   requested once, holding a fixture in flight (`new Promise(() => {})`) where the page mounts
   later; a redirect lands in `router.state.location.pathname` with `router.history.length` still 1.

### Put a period in the URL

`beforeLoad: defaultRange(preset.range, '/the/route')`, `loaderDeps` on `from` and `to`, the loader
resolves `loaderPeriod(loader.deps, preset)` and returns it, the page reads it with
`useLoaderData()` for its query and any figure derived from the bounds, and keeps a
`useDateRangeController` only for the picker. Never build the period in the page: the loader and
the page would read the clock at different moments.

### Keep a list right after a mutation

Prefer an updater in `src/lib/urql-cache.ts` (`cache.invalidate(entity, field, args)` or
`updateQuery`) over `reexecuteQuery` in the component. A change to fields of an entity the mutation
returns with its `id` needs neither. Where a component does re-execute, pass `network-only`.

### Add a settings or members section

Add the route under the section's parent with `loader: loader => loadSection(loader, 'thing')`,
warming the section's own document first; add the section to the page's `sections` table and to its
`*Sections` function under its permission (`settingsSections`, `organizationSettingsSections`,
`projectSettingsSections`, `membersSections`). The nav and the loaders agree through that function.

## Testing

Run from the repo root: `pnpm vitest run packages/web/app/src`.

| Spec                                    | Guards                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/route-utils.spec.ts`               | `loadQuery` on the client in context with the preload flag; `revalidate`; the gate admits on the flag, on an error and on missing data, strips extra params, redirects per scope only when every flag is false; `defaultRange` keeps the rest of the search and asks a range function each time.       |
| `routes/target/insights.spec.ts`        | The loaders' variables and policies before render; one request per document with the page mounted; Refresh; the bare URL's default range; the period resolved once across an hour boundary; a hover warms and the visit revalidates; rows don't preload; client and coordinate start gate and stats together. |
| `routes/target/checks.spec.ts`          | Load more merges pages; a filter change starts over and keeps the selected check; the loaders' variables; one request per document; rows don't preload; the affected deployments' first page.                                                                                                          |
| `routes/target/history.spec.ts`         | The list's next page merges into the same list; the loaders' variables; one request per document; a revisit revalidates the list alone; the version pane shows an error before not-found.                                                                                                              |
| `routes/target/apps.spec.ts`            | The sort from the URL and its default; the documents' search and coordinate from the URL and their defaults; one request per render; typing writes the URL once per pause and requests once; a new sort or search keeps the rows, dimmed, never the empty state.                                        |
| `routes/target/alerts.spec.ts`          | The bare URL's default range; retention and the log started together with the loader's period; the poll repeats the bounds within a minute and moves them at the roll; rules and detail revalidate their configuration and leave the state log to the page; the create form's three documents.           |
| `routes/target/traces.spec.ts`          | The bare URL's default range; the list started with the loader's period, the default filter and sort, revalidating; a URL's filter and sort reach the variables; the trace loader's variables; the error branch before not-found.                                                                      |
| `routes/target/explorer.spec.ts`        | Each view's documents with the loader's period, the type name where it applies, gates read once and usage revalidating; one request per document with a view mounted; a bare URL takes the remembered preset, else the last week; filters survive the redirect; a preset lands in the URL and is remembered. |
| `routes/target/proposals.spec.ts`       | The list started with the stages from the URL, or the default three, revalidating; the proposal started with version and timestamp, its changes left to the page; a new timestamp is a new request; the list renders from the cache with no load-more control.                                          |
| `routes/organization/route.spec.ts`     | The overview started with the 14-day window as loader data, revalidating; support and a ticket warmed; the subscription pages redirect without Stripe and warm their documents with it.                                                                                                                 |
| `routes/organization/settings.spec.ts`  | The page document once for the page and its section; token and SSO sections started revalidating; a hidden section falls back to the first visible one; the personal tokens' pages merge into one list.                                                                                                |
| `routes/organization/members.spec.ts`   | The gate on the layout flag beside the page document; the list's filter reaching the variables; groups started by slug, revalidating, with the URL's search; a hidden section falls back to the list.                                                                                                  |
| `routes/project/route.spec.ts`          | The overview as above; project alerts warmed read-once beside the gate, and the gate's redirect.                                                                                                                                                                                                        |
| `routes/project/settings.spec.ts`       | The page document once beside one layout request; General warms the GitHub details; tokens revalidate; Composition falls back to General for a single-schema project; a viewer without General lands on Policy; a viewer with neither flag lands on the project.                                        |
| `routes/render.spec.ts`                 | The chrome at every page; the layout loaders' variables; the permission gates redirect with one history entry and one layout request; the settings, members and alerts sections; tables show skeleton rows while they load; failed page queries show the error; a CDN create refetches the open page.     |
| `routes/legacy.spec.ts`                 | Every old URL shape lands on its new path, carrying its search, without a history entry.                                                                                                                                                                                                                |
| `routes/target/settings-cdn.spec.tsx`   | The one spec on the app's own client, exchanges and all: a CDN create through the modal refetches the open page.                                                                                                                                                                                        |
| `lib/urql-cache.spec.ts`                | The updaters against a stub cache, and the CDN updaters through the real cache.                                                                                                                                                                                                                         |
| `lib/overview-period.spec.ts`, `lib/hooks/use-interval.spec.ts`, `lib/hooks/use-date-range-controller.spec.ts` | The helpers alone: the window, the poll that never fires on mount, `loaderPeriod` against `resolveDateRange`.                                                                                                                                                                  |
| `router.spec.ts`                        | The pending defaults and `defaultPreload`.                                                                                                                                                                                                                                                              |
| `lib/testing/urql.spec.ts`              | The test client answers by operation name, records variables and context, holds promise fixtures, fails a fixture that no longer covers its document, and checks only the fragments of the union member a fixture is.                                                                                   |

`createTestClient(fixtures)` (`src/lib/testing/urql.ts`) is a client on the app's own graphcache
configuration whose network is a lookup by operation name. `seen` and `operations` are the requests
that reached the network, and `requests(name)` narrows them to one document: a cache hit is absent,
the network leg of a `cache-and-network` hit arrives as `network-only`, including a partial hit
where the layout already cached the entity, and an invalidated or partial read arrives again. A spec
asserts variables, policies and the `preload` flag on them; where the policy may have been forwarded
either way, it asserts "revalidating" as either. Graphcache also strips a variable the document
does not declare (the proposal's `timestamp`) from what reaches the network, though the request key
still carries it. A promise fixture holds its request in flight until it settles, which is how a
spec proves a page joined the loader's request; an `Error` fixture answers as a failed request. The
env, laboratory, SuperTokens and AutoSizer stand-ins live in `src/lib/testing/mocks/`, one `vi.mock`
line each in the spec, since there is no app-scoped vitest project to hold `setupFiles`. Fixtures
(`src/lib/testing/fixtures/`) carry `__typename` on every object below the root, as the server
would, and are checked against the document they answer: a missing field, including a typename,
fails with its path named. Two documents that describe the same entity must agree in their fixtures,
since the cache normalizes them into one. No fake timers, except the clock alone
(`vi.useFakeTimers({ toFake: ['Date'] })`) when a case needs time to move: timers, the router and
`waitFor` stay real; a poll under test gets its interval mocked short instead.
