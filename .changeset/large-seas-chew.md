---
'@graphql-hive/render-laboratory': patch
'@graphql-hive/laboratory': patch
---

Lab: Add a schema documentation pane, opt-in via the new `enableDocs` prop.

When enabled, a third icon appears in the left rail and opens documentation in the same slot as Collections and History: browse root types, types and fields, search across the whole type map (including input objects and enum values), and read descriptions, deprecations and argument defaults. Builder rows gain an "Open in Docs" context menu entry, and the GraphQL editor hover gains an "Open in Docs" link. `renderLaboratory` enables the pane by default, so standalone embedders of the UMD bundle get it without passing `enableDocs`.

`enableDocs` also decides whether introspection asks for descriptions, so a host that supplies `defaultSchemaIntrospection` must build it with descriptions itself. Building it with `introspectionFromSchema` does that by default.

**Removed:** the `introspection.schemaDescription` setting and its toggle in the settings dialog. It was wired to graphql-js's `descriptions` option rather than `schemaDescription`, and defaulted to `false` where graphql-js defaults to `true`, so nothing rendered descriptions and the toggle had no discoverable effect. Descriptions now follow `enableDocs`. `render-laboratory` no longer maps Yoga's `schemaDescription` option.

