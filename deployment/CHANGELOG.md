# hive

## 5.1.3

### Patch Changes

- [#6553](https://github.com/graphql-hive/console/pull/6553)
  [`f0fe03c`](https://github.com/graphql-hive/console/commit/f0fe03c9464815b5f11b8e4715f0182959e8d363)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Standardize the design and content of
  all email templates for consistency.

- [#6571](https://github.com/graphql-hive/console/pull/6571)
  [`bf06e94`](https://github.com/graphql-hive/console/commit/bf06e94f5f115770f229b0b6e9961a44f057fa4d)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds ability to all services to write a
  heap dump to a disk when SIGUSR1 signal is received

- [#6593](https://github.com/graphql-hive/console/pull/6593)
  [`ef1efbb`](https://github.com/graphql-hive/console/commit/ef1efbb8c26e40a715e5bb14c99b0734c095bef7)
  Thanks [@jdolle](https://github.com/jdolle)! - Fix operation insights showing loading for missing
  operations

- [#6582](https://github.com/graphql-hive/console/pull/6582)
  [`bb2f2aa`](https://github.com/graphql-hive/console/commit/bb2f2aa30f6cd4a5427e7d977c816d7e78499ea2)
  Thanks [@jdolle](https://github.com/jdolle)! - Adds optional url argument to schema checks

- [#6586](https://github.com/graphql-hive/console/pull/6586)
  [`e10de03`](https://github.com/graphql-hive/console/commit/e10de0370cd713db1815eee9cabb52725cf5c3b9)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Corrected an issue where fields from
  type extensions were not marked as unused when appropriate

- [#6542](https://github.com/graphql-hive/console/pull/6542)
  [`719e3e6`](https://github.com/graphql-hive/console/commit/719e3e68643c673c5539cc18b68772661e52a857)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Consolidates email templating logic
  into the `emails` service.

## 5.1.2

### Patch Changes

- [#6518](https://github.com/graphql-hive/console/pull/6518)
  [`a8a2da5`](https://github.com/graphql-hive/console/commit/a8a2da5d65c09885dd3aa6d9bbe017cf4b9efebf)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Ensure response body is read before
  timeout to avoid abort errors in S3 client (CDN)

- [#6536](https://github.com/graphql-hive/console/pull/6536)
  [`6cdcef1`](https://github.com/graphql-hive/console/commit/6cdcef1b2a1f75da372f22ddeefe3951a85fd02c)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds an index to
  coordinates\_(daily,hourly,minutely) tables to speedup the get_top_operations_for_types ClickHoue
  query.

  Reading of type and fields usage statisticts should be noticeably faster now on big datasets.

## 5.1.1

### Patch Changes

- [#6502](https://github.com/graphql-hive/console/pull/6502)
  [`cef7fd8`](https://github.com/graphql-hive/console/commit/cef7fd88e4929942bcaf07aaf3bc226c5d9a38cd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Update @theguild/federation-composition
  to 0.14.4

  - Fix a child data type field not being accessible via interfaceObject
  - Respect inaccessible enum values while creating the public schema from the supergraph AST

## 5.1.0

### Minor Changes

- [#6449](https://github.com/graphql-hive/console/pull/6449)
  [`0504530`](https://github.com/graphql-hive/console/commit/05045306b789e97ec39cbd2c8ee2b4f1b721dc9e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Modify GraphQL fields used by CLI to accept an
  optional specified target that is used for identifying the affected target instead of resolving
  the target from the access token.

### Patch Changes

- [#6472](https://github.com/graphql-hive/console/pull/6472)
  [`4d3d6fc`](https://github.com/graphql-hive/console/commit/4d3d6fcdc2d7f65e6366fd76a058c3f687c4da4c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Improve the usage reporting endpoint error
  responses to include all the errors for invalid JSON bodies.

- [#6455](https://github.com/graphql-hive/console/pull/6455)
  [`6924a1a`](https://github.com/graphql-hive/console/commit/6924a1abf91c1c663d752949031e0a5c4078392a)
  Thanks [@jasonkuhrt](https://github.com/jasonkuhrt)! - A minor defect in Laboratory has been fixed
  that previously caused the application to crash when local storage was in a particular state.

## 5.0.0

### Major Changes

- [#6231](https://github.com/graphql-hive/console/pull/6231)
  [`b7e4052`](https://github.com/graphql-hive/console/commit/b7e4052ecfd8f70fefe39c27886619a24faa7526)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - New permission system for organization member
  roles.

  The existing scopes assigned to organization members have been replaced with a permissions-based
  system, enabling more granular access control and role-based access control (RBAC) in Hive.

  **Breaking Changes**

  - **Viewer Role Adjustments** – Members with the default Viewer role can no longer create targets
    or projects.
  - **Restricted Role Management** – Permissions for inviting, removing, and assigning roles have
    been revoked. An admin must manually reassign these permissions where needed.
  - **Expanded Role Assignment** Capabilities – Members with permissions to manage invites, remove
    members, or modify roles can now grant additional permissions without restrictions. Caution is
    advised when assigning these rights, as they should be reserved for "Admin" roles.

  These changes enhance security and provide greater flexibility in managing user permissions across
  organizations.

### Minor Changes

- [#6378](https://github.com/graphql-hive/console/pull/6378)
  [`f14daa8`](https://github.com/graphql-hive/console/commit/f14daa89760149d6b1eb45d5351d73c4376b7418)
  Thanks [@jasonkuhrt](https://github.com/jasonkuhrt)! - You can now set HTTP headers in your
  [Laboratory Preflight Script](https://the-guild.dev/graphql/hive/docs/dashboard/laboratory/preflight-scripts).
  Every time you run a request from Laboratory, your preflight headers, if any, will be merged into
  the request before it is sent.

  You achieve this by interacting with the
  [`Headers`](https://developer.mozilla.org/docs/web/api/headers) instance newly available at
  `lab.request.headers`. For example, this script would would add a `foo` header with the value
  `bar` to every Laboratory request.

  ```ts
  lab.request.headers.set('foo', 'bar')
  ```

  A few notes about how headers are merged:

  1. Unlike static headers, preflight headers do not receive environment variable substitutions on
     their values.
  2. Preflight headers take precedence, overwriting any same-named headers already in the Laboratory
     request.

  Documentation for this new feature is available at
  https://the-guild.dev/graphql/hive/docs/dashboard/laboratory/preflight-scripts#http-headers.

- [#6123](https://github.com/graphql-hive/console/pull/6123)
  [`abfd1b1`](https://github.com/graphql-hive/console/commit/abfd1b1ea9b6850683f31c152516d9e0d97d94aa)
  Thanks [@Intellicode](https://github.com/Intellicode)! - encode postgres variables and introduce
  optional password

- [#6412](https://github.com/graphql-hive/console/pull/6412)
  [`f352bba`](https://github.com/graphql-hive/console/commit/f352bbac977902120527fbea2afb0b0b7dd253fb)
  Thanks [@Intellicode](https://github.com/Intellicode)! - Added a new environment variable
  `PROMETHEUS_METRICS_PORT` to control the promethus port of the policy service. The default value
  is `10254` (no action needed).

### Patch Changes

- [#6398](https://github.com/graphql-hive/console/pull/6398)
  [`0e4be14`](https://github.com/graphql-hive/console/commit/0e4be14256937f492efcb4a7dc97b59918274a2a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Remove the db leftovers related to
  activities (no longer a thing)

- [#6433](https://github.com/graphql-hive/console/pull/6433)
  [`a902d8b`](https://github.com/graphql-hive/console/commit/a902d8bb974c0ea707a17ff3d921a6cf13972ead)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Improves validation for operation
  durations and error totals. Prevents processing of invalid usage report data.

- [#6374](https://github.com/graphql-hive/console/pull/6374)
  [`393ece7`](https://github.com/graphql-hive/console/commit/393ece7eab93ed0b7873e4428f78a5c27cf764fa)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adjust the Kafka message size
  estimation only when Kafka gives back `MESSAGE_TOO_LARGE` error

- [#6358](https://github.com/graphql-hive/console/pull/6358)
  [`ab06518`](https://github.com/graphql-hive/console/commit/ab065182d89e6d7e4c90469d0bcaadacfa4c3b1e)
  Thanks [@jdolle](https://github.com/jdolle)! - Use sum instead of max of top request counts for
  breaking changes calculation

## 4.1.0

### Minor Changes

- [#6400](https://github.com/graphql-hive/console/pull/6400)
  [`d2a4387`](https://github.com/graphql-hive/console/commit/d2a4387b64fe71340159c536a05dd38b1a35c751)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Display logs from the Preflight Script
  in Laboratory

- [#6348](https://github.com/graphql-hive/console/pull/6348)
  [`e754700`](https://github.com/graphql-hive/console/commit/e75470021282b84b622560c8a991c196ee7f24d7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds ability to select a default role
  for new OIDC users

- [#6351](https://github.com/graphql-hive/console/pull/6351)
  [`ba20748`](https://github.com/graphql-hive/console/commit/ba207485ad8b8868c73b736397c8f7f2416b86d3)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added a new environment variable
  `OPENTELEMETRY_TRACE_USAGE_REQUESTS` for `rate-limit` and `tokens` services.

  Self-hosters who wish to report telemetry information for `usage` service, can opt-in and set
  `OPENTELEMETRY_TRACE_USAGE_REQUESTS=1` to these services. This will skip sampling and will always
  trace requests originating from the `usage` service.

- [#6388](https://github.com/graphql-hive/console/pull/6388)
  [`a8ff443`](https://github.com/graphql-hive/console/commit/a8ff443307fa9929f0b466c6a83d695bd5e707dd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Add multi-column sort to Insights >
  Operations table

- [#6389](https://github.com/graphql-hive/console/pull/6389)
  [`781b140`](https://github.com/graphql-hive/console/commit/781b140ffb5d5256913941763b79665965c53a6c)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Show Impact metric in the Operations
  list on the Insights page. Impact equals to the total time spent on this operation in the selected
  period in seconds. It helps assess which operations contribute the most to overall latency.

  ```
  Impact = Requests * avg/1000
  ```

- [#6393](https://github.com/graphql-hive/console/pull/6393)
  [`84fd770`](https://github.com/graphql-hive/console/commit/84fd770b6c7bc3fdd62af6d337889e3c2596ef15)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Add type definitions of global.lab to
  Preflight Script editor

- [#6351](https://github.com/graphql-hive/console/pull/6351)
  [`ba20748`](https://github.com/graphql-hive/console/commit/ba207485ad8b8868c73b736397c8f7f2416b86d3)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added OpenTelemetry traces to Usage service
  using a new `OPENTELEMETRY_COLLECTOR_ENDPOINT` env var.

  This option is disabled by default for self-hosting, you can opt-in by setting
  `OPENTELEMETRY_COLLECTOR_ENDPOINT`.

### Patch Changes

- [#6386](https://github.com/graphql-hive/console/pull/6386)
  [`d19229f`](https://github.com/graphql-hive/console/commit/d19229fb6e4f48237a925987ff1a60b6b651a784)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Remove the code leftovers related to
  activities (no longer a thing)

- [#6380](https://github.com/graphql-hive/console/pull/6380)
  [`40213fb`](https://github.com/graphql-hive/console/commit/40213fb7dc39cfb2688e6127e8fe2658f7fceb7f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Update
  `@theguild/federation-composition` to
  [v0.14.3](https://github.com/the-guild-org/federation/releases/tag/v0.14.3)

- [#6399](https://github.com/graphql-hive/console/pull/6399)
  [`607192e`](https://github.com/graphql-hive/console/commit/607192eaa5d6c3dcc6a2d0c4ff406a7d6f06ca42)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Disable "select organization" dropdown
  for OIDC accounts

## 4.0.1

### Patch Changes

- [`c6a21ff`](https://github.com/graphql-hive/console/commit/c6a21ffa1bbb32afef86fd137ec3aec1e9b48545)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Bump version to test release flow

## 4.0.0

### Major Changes

- [#6259](https://github.com/graphql-hive/console/pull/6259)
  [`1168564`](https://github.com/graphql-hive/console/commit/1168564ef06e10e90381ad7808f46c5f205be3ea)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - No longer support the legacy registry
  models. Announcement https://the-guild.dev/blog/graphql-hive-improvements-in-schema-registry

### Minor Changes

- [#6340](https://github.com/graphql-hive/console/pull/6340)
  [`3183f5a`](https://github.com/graphql-hive/console/commit/3183f5a9b40ab389b413199747aeff4b9ea1cbe8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Remove the legacy member role assignment wizard.

- [#6341](https://github.com/graphql-hive/console/pull/6341)
  [`2fa3352`](https://github.com/graphql-hive/console/commit/2fa33520b36e4a0662ab9c74abc06fb4705d2a53)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Allow to close the last tab in
  Laboratory

- [#6254](https://github.com/graphql-hive/console/pull/6254)
  [`b58d2c5`](https://github.com/graphql-hive/console/commit/b58d2c5fdb856a3f0710d1551e1e9306eb7cbcc0)
  Thanks [@jdolle](https://github.com/jdolle)! - Add option for checking breaking changes by a fixed
  request count

### Patch Changes

- [#6332](https://github.com/graphql-hive/console/pull/6332)
  [`6b9192c`](https://github.com/graphql-hive/console/commit/6b9192c71845d3312cb2a9b1e7c1d9a552fb6f8f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Assigns custom roles to members without
  a role to complete https://the-guild.dev/graphql/hive/product-updates/2023-12-05-member-roles

- [#6369](https://github.com/graphql-hive/console/pull/6369)
  [`b40cabd`](https://github.com/graphql-hive/console/commit/b40cabda747641f13fcf183557ce023d12eec2b1)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix the audit log export

- [#6368](https://github.com/graphql-hive/console/pull/6368)
  [`0c2e953`](https://github.com/graphql-hive/console/commit/0c2e953fac76cff1c7cb397468c480c28366f665)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix connecting slack integration.

- [#6365](https://github.com/graphql-hive/console/pull/6365)
  [`bab2cf0`](https://github.com/graphql-hive/console/commit/bab2cf08a596892bc2c7ac0a1e5b00673808bff6)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Fix release and package flow for Docker
  images of `hive`

## 3.0.0

### Major Changes

- [#6066](https://github.com/graphql-hive/console/pull/6066)
  [`e747e4c`](https://github.com/graphql-hive/console/commit/e747e4cd44e6516809754e1be2999a698153c598)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Drop user accounts and organization not linked to a
  SuperTokens account.

  This is mainly a cleanup for legacy accounts on Hive Cloud that were not migrated from Auth0 some
  years ago. It should not affect self-hosters.

### Minor Changes

- [#6261](https://github.com/graphql-hive/console/pull/6261)
  [`09c01d6`](https://github.com/graphql-hive/console/commit/09c01d6491dae9c3963de04c6e841ee9813bcaa3)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds a response validation of the POST
  https://slack.com/api/oauth.v2.access request.

  This request is made when connecting Slack to Hive. This is to ensure that the response is a JSON
  object and that it contains the expected keys and provide informative error messages if it does
  not.

### Patch Changes

- [#6265](https://github.com/graphql-hive/console/pull/6265)
  [`cecd95b`](https://github.com/graphql-hive/console/commit/cecd95bc6cdc29f6b81df8b221858201b49184ce)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Relax `uuid` check for external IDs in
  audit log metadata. Fixes https://github.com/graphql-hive/console/issues/6264

- [#6262](https://github.com/graphql-hive/console/pull/6262)
  [`d98e146`](https://github.com/graphql-hive/console/commit/d98e1468a27fafde5b080c0b0ce02696ce4a589d)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Resolve the issue where the laboratory
  mocked endpoint consistently returns: "Please publish your first schema to Hive."

- [#6267](https://github.com/graphql-hive/console/pull/6267)
  [`817fed3`](https://github.com/graphql-hive/console/commit/817fed329bf10a1c31ab253c00bd4efa13e6699c)
  Thanks [@dotansimha](https://github.com/dotansimha)! - bugfix: `scrollIntoView` is not a function
  in lab page (fixed https://github.com/graphql-hive/console/issues/6263)

- [#6282](https://github.com/graphql-hive/console/pull/6282)
  [`a7f9d50`](https://github.com/graphql-hive/console/commit/a7f9d50fb9026536311b4c973433d38e17ab0e73)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix editor state and operation handling
  in Laboratory.

  When opening a new tab or selecting a saved operation, the editor incorrectly populated the query,
  defaulting to the active query. This made it impossible to view the selected operation.
  Additionally, the submit button for saving an operation was always disabled, even when the form
  was in a valid state.

## 2.1.0

### Minor Changes

- [#5564](https://github.com/graphql-hive/console/pull/5564)
  [`e0eb3bd`](https://github.com/graphql-hive/console/commit/e0eb3bdb289c6349f51d71ba0570328d2f4e98d7)
  Thanks [@dimaMachina](https://github.com/dimaMachina)! - Add preflight scripts for laboratory.

  It is now possible to add a preflight script within the laboratory that executes before sending a
  GraphQL request.
  [Learn more.](https://the-guild.dev/graphql/hive/product-updates/2024-12-27-preflight-script)

- [#5530](https://github.com/graphql-hive/console/pull/5530)
  [`38c14e2`](https://github.com/graphql-hive/console/commit/38c14e21d8fd76f04a750ede3aac07aa10685687)
  Thanks [@TuvalSimha](https://github.com/TuvalSimha)! - Add organization audit log.

  Each organization now has an audit log of all user actions that can be exported by admins.
  Exported audit logs are stored on the pre-configured S3 storage.

  In case you want to store exported audit logs on a separate S3 bucket, you can use the
  `S3_AUDIT_LOG` prefixed environment variables for the configuration.

  [Learn more.](https://graphql-hive.com/product-updates/2024-12-27-audit-logs)

- [#6234](https://github.com/graphql-hive/console/pull/6234)
  [`eecd099`](https://github.com/graphql-hive/console/commit/eecd099309e2308f216c709a1fe23f15f6d6318b)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds
  `lab.prompt(message, defaultValue)` to Preflight Script API

### Patch Changes

- [#6232](https://github.com/graphql-hive/console/pull/6232)
  [`ff44b62`](https://github.com/graphql-hive/console/commit/ff44b62aebc4b5d4e3ff321ad3ed59694d94330a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Improvements to UI of Preflight Script
  (Laboratory)

- [#6233](https://github.com/graphql-hive/console/pull/6233)
  [`7b0c920`](https://github.com/graphql-hive/console/commit/7b0c920c578a9220c0bad69d2f6b69023f8beece)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Tiny UI fixes

## 2.0.1

### Patch Changes

- [#6158](https://github.com/graphql-hive/console/pull/6158)
  [`3093c9f`](https://github.com/graphql-hive/console/commit/3093c9fc23ab0a53926a187a91fe93ef6fee5be1)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added missing index for postgres db field
  "schema_version_changes.schema_version_id"

## 2.0.0

### Major Changes

- [#6142](https://github.com/graphql-hive/console/pull/6142)
  [`25f1460`](https://github.com/graphql-hive/console/commit/25f14604f482ac42826c63ec08bc108a67d37fd0)
  Thanks [@TuvalSimha](https://github.com/TuvalSimha)! - Upgrade the PostgreSQL version for Docker
  Compose from version 14.13 to use 16.4.

  **This change is published as major, as it requires attention based on your setup.**

  For self-hosters with a managed database, we recommend upgrading PostgreSQL based on your Cloud
  provider's or IT's recommendation.

  For self-hosters running in Docker, you can read about
  [upgrading PostgreSQL in a Docker container here](https://helgeklein.com/blog/upgrading-postgresql-in-docker-container/).

  > The Hive data that was previously created with PostgreSQL v14 is compatible with v16.

### Patch Changes

- [#6156](https://github.com/graphql-hive/console/pull/6156)
  [`b6eb5d0`](https://github.com/graphql-hive/console/commit/b6eb5d0e71e5b1d7575756d440bdbfb3116950b7)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Improvement for OTEL tracing and added
  missing attributes

- [#6156](https://github.com/graphql-hive/console/pull/6156)
  [`b6eb5d0`](https://github.com/graphql-hive/console/commit/b6eb5d0e71e5b1d7575756d440bdbfb3116950b7)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Performance improvements for Postgres DB
  calls (specifically `getSchemasOfVersion`, see https://github.com/graphql-hive/console/pull/6154)

## 1.2.4

### Patch Changes

- [#6138](https://github.com/graphql-hive/console/pull/6138)
  [`349a67d`](https://github.com/graphql-hive/console/commit/349a67d09ccadc22c0f3b84ceafa7157c5f3e979)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Prevent stripe.js from loading
  automatically

## 1.2.3

### Patch Changes

- [#6115](https://github.com/graphql-hive/console/pull/6115)
  [`0d7ce02`](https://github.com/graphql-hive/console/commit/0d7ce02082a5ac02111b888132209ee0ef34c831)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Move information about target and
  organization to logger's metadata in usage service

- [#6121](https://github.com/graphql-hive/console/pull/6121)
  [`6d78547`](https://github.com/graphql-hive/console/commit/6d78547a0f29a732713052d33d207396144e0998)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Make optional properties optional or
  nullable in usage report v2

- [#6111](https://github.com/graphql-hive/console/pull/6111)
  [`cffd08a`](https://github.com/graphql-hive/console/commit/cffd08a53d7e5a53bb59fa68e940b693e9102485)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix a missing @join\_\_field on a query
  field where @override is used, but not in all subgraphs.

## 1.2.2

### Patch Changes

- [#6065](https://github.com/graphql-hive/console/pull/6065)
  [`9297f33`](https://github.com/graphql-hive/console/commit/9297f33ad6c2c0a5ff77ea92c43ca5c97fd9a2d8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Allow organizations without a GitHub or Slack
  integration to add and manage integrations.

## 1.2.1

### Patch Changes

- [#5945](https://github.com/graphql-hive/console/pull/5945)
  [`03f08ca`](https://github.com/graphql-hive/console/commit/03f08ca68bb675696208a31ca002c74a628edbbb)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Require "registry write" permissions for approving
  failed schema checks, schema versions, and the laboratory.

- [#5989](https://github.com/graphql-hive/console/pull/5989)
  [`a87a541`](https://github.com/graphql-hive/console/commit/a87a541153db901fc41fae0f33cd5de52324d8dd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Retry calls to Github API when creating
  check-runs

- [#5989](https://github.com/graphql-hive/console/pull/5989)
  [`a87a541`](https://github.com/graphql-hive/console/commit/a87a541153db901fc41fae0f33cd5de52324d8dd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Inform users about Github API issues
  when creating check runs

## 1.2.0

### Minor Changes

- [#5897](https://github.com/graphql-hive/console/pull/5897)
  [`cd9a13c`](https://github.com/graphql-hive/console/commit/cd9a13cd4f98700c79db89ac4dd60f0578442efe)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Update `supertokens-postgresql` to `9.3`.

### Patch Changes

- [#5924](https://github.com/graphql-hive/console/pull/5924)
  [`5ad52ba`](https://github.com/graphql-hive/console/commit/5ad52ba4d1ad002a8e3b233cefe762324113cf6a)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix logging for invalid operation body within usage
  reporting.

## 1.1.1

### Patch Changes

- [#5907](https://github.com/graphql-hive/console/pull/5907)
  [`5adfb6c`](https://github.com/graphql-hive/console/commit/5adfb6c39dce653ffef9fdf6af9a6a582cac0231)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Remove option to remove the organization owner from
  the organization.

## 1.1.0

### Minor Changes

- [#5884](https://github.com/graphql-hive/platform/pull/5884)
  [`8aec41a`](https://github.com/graphql-hive/platform/commit/8aec41a36ee897aad0057e6817a9433a545fd18d)
  Thanks [@andriihrachov](https://github.com/andriihrachov)! - Add `REDIS_TLS_ENABLED` environment
  variable for enabling and disabling Redis TLS for `emails`, `schema`, `tokens`, `webhooks` and
  `server` services.

- [#5889](https://github.com/graphql-hive/platform/pull/5889)
  [`0eef5ed`](https://github.com/graphql-hive/platform/commit/0eef5edc6b8a940d3e70b5ea322a73ac6af07d33)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Update `supertokens-postgresql` to `8.0`.

## 1.0.2

### Patch Changes

- [#5872](https://github.com/graphql-hive/platform/pull/5872)
  [`580d349`](https://github.com/graphql-hive/platform/commit/580d349d45b85dc6103b39c6e07bc3d81e5d3bc9)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump @theguild/federation-composition
  to v0.14.1

## 1.0.1

### Patch Changes

- [#5858](https://github.com/graphql-hive/platform/pull/5858)
  [`11973c7`](https://github.com/graphql-hive/platform/commit/11973c773a3251d4b00d1bd4a509e06bfaf5288f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - fix: conditional breaking changes form
  [#5852](https://github.com/graphql-hive/platform/pull/5852)

## 1.0.0

**This is the first officially versioned release of Hive.**

While it has been available and in use for some time, this marks the introduction of formal
versioning and a changelog to track future updates and improvements.
