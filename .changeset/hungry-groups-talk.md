---
'@graphql-hive/laboratory': patch
---

Laboratory: Fix hovers, tooltips and several builder defects, and add copy as cURL, a reload-schema button and an introspection polling toggle.

**Added**

- Copy as cURL in the operation toolbar.
- A reload-schema button in the builder, which introspects over the network even when a schema was supplied by the host, and spins while the request is in flight. It replaces the previous "restore default endpoint" button; `restoreDefaultEndpoint` remains available on the API.
- `introspection.pollSchema` setting to turn off the 5 second introspection poll and refresh the schema only on demand.
- `enableFullScreen` prop (default `true`) so hosts that already fill the viewport can hide the full screen control.
- The Query Plan tab is now always shown, with an empty state explaining that plans appear when the gateway returns `extensions.queryPlan`.

**Fixed**

- The builder no longer collapses expanded fields while introspection is polling. An unchanged schema previously produced a new `GraphQLSchema` on every poll, resetting expansion to the depth of the current document.
- Editor hovers now appear on mouse over, so validation messages and schema documentation are readable.
- Monaco's folding chevrons render as icons instead of empty squares. Font faces are now registered on the document, where browsers resolve them, rather than inside the shadow root where they are ignored.
- Response size is shown in real units instead of always reading `0KB`, and is measured in UTF-8 bytes.
- Tooltips attached with `asChild` now appear. `Button`, `TooltipTrigger` and `AlertDialogTrigger` did not forward refs, leaving the tooltip without an element to anchor to.
- The builder's tree/list toggle is controlled, cannot be deselected into an empty state, and is disabled with an explanation until a search is active.
- The Query Plan panel no longer throws while rendering when a response body is not JSON.
- monaco-graphql is initialized once and updated in place, so variables validation registers regardless of which editor mounts first and survives an endpoint change.
- Removed invalid nested buttons in builder and collection rows, which also makes the collection edit and delete actions keyboard reachable.
- The query plan visualization no longer updates state during render.
