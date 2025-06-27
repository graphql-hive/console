# hive

## 8.1.0

### Minor Changes

- [#6843](https://github.com/graphql-hive/console/pull/6843)
  [`d175fba`](https://github.com/graphql-hive/console/commit/d175fba8f17f36ce3205e14032eee89222f85f08)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Make `Target.graphqlEndpointUrl` available
  in public GraphQL API

### Patch Changes

- [#6829](https://github.com/graphql-hive/console/pull/6829)
  [`e81cea8`](https://github.com/graphql-hive/console/commit/e81cea889c26b3ee0453defbfec5a78ba24e90a6)
  Thanks [@jdolle](https://github.com/jdolle)! - Add pg index for getSchemaVersionByActionId to
  improve lookup performance

- [#6850](https://github.com/graphql-hive/console/pull/6850)
  [`faa22bb`](https://github.com/graphql-hive/console/commit/faa22bbe662f0df7cca3b9045a22d495897714ee)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix issue where contract composition marks types
  occuring in multiple subgraphs as `@inaccessible` despite being used within the public API schema.

- [#6845](https://github.com/graphql-hive/console/pull/6845)
  [`114e7bc`](https://github.com/graphql-hive/console/commit/114e7bcf6860030b668fb1af7faed3650c278a51)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Update `@theguild/federation-composition` to
  `0.19.0`

  Increases federation composition compatibility.

  - Fix errors raised by `@requires` with union field selection set
  - Fix incorrectly raised `IMPLEMENTED_BY_INACCESSIBLE` error for inaccessible object fields where
    the object type is inaccessible.
  - Add support for `@provides` fragment selection sets on union type fields.
  - Fix issue where the satisfiability check raised an exception for fields that share different
    object type and interface definitions across subgraphs.
  - Fix issue where scalar type marked with `@inaccessible` does not fail the composition if all
    usages are not marked with `@inaccessible`.
  - Support composing executable directives from subgraphs into the supergraph

- [#6862](https://github.com/graphql-hive/console/pull/6862)
  [`6cf18b9`](https://github.com/graphql-hive/console/commit/6cf18b9d9c10dfcbd95d148571dc305eb5c71b4c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Show whether a breaking change is safe based on
  usage within the GitHub check-run summary.

- [#6864](https://github.com/graphql-hive/console/pull/6864)
  [`35a69a1`](https://github.com/graphql-hive/console/commit/35a69a1064319c74b9b76a521698ce1260383f08)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Validate schema stitching output sdl. Previously,
  this caused invalid SDL to be promoted as the latest valid schema version.

## 8.0.0

### Major Changes

- [#6810](https://github.com/graphql-hive/console/pull/6810)
  [`ae65069`](https://github.com/graphql-hive/console/commit/ae65069da79f3863ddfe6c4da80826af2b8c4b0a)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add mutation fields for managing schema contracts
  to the public api schema.

  - `Mutation.createContract`
  - `Mutation.disableContract`

  **BREAKING CHANGE**: This renames and changes the types for existing types within the private
  GraphQL schema.

- [#6722](https://github.com/graphql-hive/console/pull/6722)
  [`aab6e7c`](https://github.com/graphql-hive/console/commit/aab6e7c2cfbd8453e0062362fc10244da98d57d1)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add mutation fields for managing users to the
  public api schema.

  - `Mutation.assignMemberRole`
  - `Mutation.createMemberRole`
  - `Mutation.deleteMemberRole`
  - `Mutation.deleteOrganizationInvitation`
  - `Mutation.inviteToOrganizationByEmail`
  - `Mutation.updateMemberRole`

  **BREAKING CHANGE**: This renames and changes the types for existing types within the private
  GraphQL schema.

- [#6786](https://github.com/graphql-hive/console/pull/6786)
  [`20bfc4c`](https://github.com/graphql-hive/console/commit/20bfc4c052367efd9bc4d8e9a35e0a72aee2c95b)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add mutation fields for managing projects to the
  public api schema.

  - `Mutation.createProject`
  - `Mutation.updateProjectSlug`
  - `Mutation.deleteProject`

  **BREAKING CHANGE**: This renames and changes the types for existing types within the private
  GraphQL schema.

- [#6795](https://github.com/graphql-hive/console/pull/6795)
  [`3552957`](https://github.com/graphql-hive/console/commit/3552957eeb2c7bf2bf74d912f58b32e56d6bc69f)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add fields for querying usage datato the public api
  schema.

  - `Target.schemaCoordinateStats`
  - `Target.clientStats`
  - `Target.operationsStats`

  **BREAKING CHANGE**: This renames and changes the types for existing types within the private
  GraphQL schema.

### Minor Changes

- [#6764](https://github.com/graphql-hive/console/pull/6764)
  [`bbd5643`](https://github.com/graphql-hive/console/commit/bbd5643924eb2b32511e96a03a3a5a978a66adee)
  Thanks [@jdolle](https://github.com/jdolle)! - Track provided operation arguments/inputs and use
  them to determine conditional breaking changes; Fix null to non-null argument breaking change edge
  case"

### Patch Changes

- [#6780](https://github.com/graphql-hive/console/pull/6780)
  [`6c0b6f3`](https://github.com/graphql-hive/console/commit/6c0b6f3051d8ee73307094d124a32496f196a547)
  Thanks [@jdolle](https://github.com/jdolle)! - Add pg indexes to help with org delete

- [#6814](https://github.com/graphql-hive/console/pull/6814)
  [`7574cce`](https://github.com/graphql-hive/console/commit/7574cce6d6155628ee8303ad4e7782af4f8a303d)
  Thanks [@jdolle](https://github.com/jdolle)! - Fix random infinite loop on schema checks page

- [#6791](https://github.com/graphql-hive/console/pull/6791)
  [`6f43b3e`](https://github.com/graphql-hive/console/commit/6f43b3e753ab16e28a11d14ee5afef96be7e1c0d)
  Thanks [@jdolle](https://github.com/jdolle)! - Remove redundant pg indices

- [#6792](https://github.com/graphql-hive/console/pull/6792)
  [`54acc25`](https://github.com/graphql-hive/console/commit/54acc25e156188c22b7aaeb71ae9cce59cc94ba8)
  Thanks [@jdolle](https://github.com/jdolle)! - Adjust contract to target foreign key reference to
  cascade delete

- [#6793](https://github.com/graphql-hive/console/pull/6793)
  [`81df783`](https://github.com/graphql-hive/console/commit/81df78373a0c8a96540740c2a8e3efd9a513640e)
  Thanks [@jdolle](https://github.com/jdolle)! - Adjust date range selector ui

## 7.0.2

### Patch Changes

- [`8477e2b`](https://github.com/graphql-hive/console/commit/8477e2b7f07bc2260582b5565cee1b139f7a9e97)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Fix release notes

## 7.0.1

### Patch Changes

- [#6784](https://github.com/graphql-hive/console/pull/6784)
  [`549ca54`](https://github.com/graphql-hive/console/commit/549ca54909ad7f62892900d737d8ea1fa01d498b)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Minor bump to address release issues in
  v7.0.0

## 7.0.0

### Major Changes

- [#6758](https://github.com/graphql-hive/console/pull/6758)
  [`0cf1194`](https://github.com/graphql-hive/console/commit/0cf1194c89d82f8dd2750fb6187234b084cbfc31)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add target management fields to the public GraphQL
  API schema.

  This includes the following fields and related types/fields:

  - `Mutation.updateTargetConditionalBreakingChangeConfiguration`
  - `Mutation.updateTargetSlug`
  - `Mutation.updateTargetDangerousChangeClassification`
  - `Mutation.createTarget`
  - `Mutation.deleteTarget`
  - `Mutation.createCdnAccessToken`
  - `Mutation.deleteCdnAccessToken`
  - `Target.conditionalBreakingChangeConfiguration`
  - `Target.failDiffOnDangerousChange`
  - `Target.cdnAccessTokens`
  - `Organization.availableOrganizationAccessTokenPermissionGroups`

  **BREAKING CHANGE** This renames existing types and fields within the private GraphQL schema.

### Minor Changes

- [#6771](https://github.com/graphql-hive/console/pull/6771)
  [`4dcd45a`](https://github.com/graphql-hive/console/commit/4dcd45a683dc6004df003732b94564cfcbf135d7)
  Thanks [@jdolle](https://github.com/jdolle)! - Add meta and subgraph data to coordinate insights
  page; Fix SubgraphChip service link

- [#6626](https://github.com/graphql-hive/console/pull/6626)
  [`2056307`](https://github.com/graphql-hive/console/commit/20563078449dbb6bf33bac3b2e5ac3d2c772fc6f)
  Thanks [@jdolle](https://github.com/jdolle)! - Add target breaking change setting to turn
  dangerous changes into breaking changes

- [#6658](https://github.com/graphql-hive/console/pull/6658)
  [`e6a970f`](https://github.com/graphql-hive/console/commit/e6a970f790b388ff29f97709acdd73136a79dfb7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Adjust GraphQL schema according to schema design
  policies.

- [#6701](https://github.com/graphql-hive/console/pull/6701)
  [`f2fe6c8`](https://github.com/graphql-hive/console/commit/f2fe6c83a2467fcb77ca49c8ed5405d3f6256157)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Print dangerous schema changes as own section in
  github changes.

- [#6662](https://github.com/graphql-hive/console/pull/6662)
  [`2b220a5`](https://github.com/graphql-hive/console/commit/2b220a560c4e4777a20ec0cf5f6ee68032055022)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support federation composition validation for
  `IMPLEMENTED_BY_INACCESSIBLE`.

- [#6678](https://github.com/graphql-hive/console/pull/6678)
  [`8fd9ad0`](https://github.com/graphql-hive/console/commit/8fd9ad018a50d54eb61759ea3e178790172d82d6)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Deprecate `CriticalityLevel` scalar and fields
  referencing it in favor of the `SeverityLevelType` scalar. Expose `SchemaChange.severityLevel` and
  `SchemaChange.severityReason` via the public API endpoint.

- [#6614](https://github.com/graphql-hive/console/pull/6614)
  [`c1d9c05`](https://github.com/graphql-hive/console/commit/c1d9c0568d5a4b4671aceb831883d348db5f9a55)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add new route `/graphql-public` to the `server`
  service which contains the public GraphQL API (fields and types will follow).

- [#6675](https://github.com/graphql-hive/console/pull/6675)
  [`ed66171`](https://github.com/graphql-hive/console/commit/ed66171a4b40d439183c91600bd17044dceafcb7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Updates the
  `@theguild/federation-composition` to `v0.18.1` that includes the following changes:

  - Support progressive overrides (`@override(label: "<value>")`)
  - Allow to use `@composeDirective` on a built-in scalar (like `@oneOf`)
  - Performance improvements (lazy compute of errors), especially noticeable in large schemas (2s ->
    600ms)
  - Ensure nested key fields are marked as `@shareable`
  - Stop collecting paths when a leaf field was reached (performance improvement)
  - Avoid infinite loop when entity field returns itself

- [#6665](https://github.com/graphql-hive/console/pull/6665)
  [`cb41478`](https://github.com/graphql-hive/console/commit/cb41478829e41695df686e47dd7673a9601d6008)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Update
  `@theguild/federation-composition` to `v0.16.0`.

  - Support Apollo Federation `v2.7`, but without the progressive `@override`.
  - Support Apollo Federation `v2.8`, but without the `@context` and `@fromContext` directives.
  - Support Apollo Federation `v2.9`, including `@cost` and `@listSize` directives.

- [#6683](https://github.com/graphql-hive/console/pull/6683)
  [`ab774b7`](https://github.com/graphql-hive/console/commit/ab774b72bea54b88a2fb2ed1ea01f17a84970fc5)
  Thanks [@jdolle](https://github.com/jdolle)! - Make url optional for subsequent federated schema
  publishes

### Patch Changes

- [#6716](https://github.com/graphql-hive/console/pull/6716)
  [`1767037`](https://github.com/graphql-hive/console/commit/17670374485c36ac459150286559cb3b9edba596)
  Thanks [@jdolle](https://github.com/jdolle)! - Improve slack alert error logs

- [#6687](https://github.com/graphql-hive/console/pull/6687)
  [`349b78f`](https://github.com/graphql-hive/console/commit/349b78f39ad8fe28977f05e7542ca3e9c28092fd)
  Thanks [@jdolle](https://github.com/jdolle)! - Improve resource ID tooltip behavior

- [#6685](https://github.com/graphql-hive/console/pull/6685)
  [`a107ad3`](https://github.com/graphql-hive/console/commit/a107ad363bf2aee2ffab9d03ecf61ba0e32fac53)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix failing schema contract composition.

- [#6729](https://github.com/graphql-hive/console/pull/6729)
  [`cc552c9`](https://github.com/graphql-hive/console/commit/cc552c973c63f0a4b034b2c489c3925c347a7e75)
  Thanks [@jdolle](https://github.com/jdolle)! - Disable redis snapshotting

- [#6770](https://github.com/graphql-hive/console/pull/6770)
  [`8e02a49`](https://github.com/graphql-hive/console/commit/8e02a49b48e0cac392c2a3b4971867f39502c68b)
  Thanks [@jdolle](https://github.com/jdolle)! - Adjust contract logic to allow removing mutation
  and subscription types

- [#6602](https://github.com/graphql-hive/console/pull/6602)
  [`df3e5a2`](https://github.com/graphql-hive/console/commit/df3e5a23e5cd505d346a6d5719a4a7308aba208d)
  Thanks [@jdolle](https://github.com/jdolle)! - Added directions for publishing on no schema
  component

- [#6759](https://github.com/graphql-hive/console/pull/6759)
  [`132feb9`](https://github.com/graphql-hive/console/commit/132feb93e88667f5fdf118eb85f399e9e4330c56)
  Thanks [@jdolle](https://github.com/jdolle)! - Reduce usage service readiness threshold; Disable
  nagles algorithm and increase keepAlive from 60s to 180s for KafkaJS

- [#6713](https://github.com/graphql-hive/console/pull/6713)
  [`4f9aeae`](https://github.com/graphql-hive/console/commit/4f9aeae78a0f8feaec225dd7398aeda3000036f5)
  Thanks [@jdolle](https://github.com/jdolle)! - Do not store empty metadata in db

- [#6660](https://github.com/graphql-hive/console/pull/6660)
  [`5ff2aaa`](https://github.com/graphql-hive/console/commit/5ff2aaa624a6b9f6fe2a3633105ec7ce5ce188d5)
  Thanks [@jdolle](https://github.com/jdolle)! - fix schedule a meeting link

- [#6718](https://github.com/graphql-hive/console/pull/6718)
  [`fd9b160`](https://github.com/graphql-hive/console/commit/fd9b160015ee139bf8f09a41d14fa5446d60b3f5)
  Thanks [@jdolle](https://github.com/jdolle)! - upgrade 'got' package to fix TimeoutError case

- [#6752](https://github.com/graphql-hive/console/pull/6752)
  [`d0404db`](https://github.com/graphql-hive/console/commit/d0404db1cb0121357a9d7ea0fbdd33c03cdf243f)
  Thanks [@jdolle](https://github.com/jdolle)! - Improve external composer UX: Handle network errors
  gracefully, do not use native composer when testing, and improve settings UI

- [#6755](https://github.com/graphql-hive/console/pull/6755)
  [`60981bd`](https://github.com/graphql-hive/console/commit/60981bd94466acad9e0cf461b470c10ffbf80357)
  Thanks [@jdolle](https://github.com/jdolle)! - Correctly set usage service state to Ready after
  processing all of the fallback queue.

- [#6632](https://github.com/graphql-hive/console/pull/6632)
  [`9b2bec6`](https://github.com/graphql-hive/console/commit/9b2bec6185f939b378aa898215c56bb82119d0b6)
  Thanks [@jdolle](https://github.com/jdolle)! - Capture Stripe.js load error to avoid raising an
  unhandled error

- [#6706](https://github.com/graphql-hive/console/pull/6706)
  [`4435820`](https://github.com/graphql-hive/console/commit/4435820a2c666a39580156eea01a482768d61ab9)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Improve contract schema building for subgraphs
  using the `extend` keyword.

## 6.0.0

### Major Changes

- [#6556](https://github.com/graphql-hive/console/pull/6556)
  [`7b9129c`](https://github.com/graphql-hive/console/commit/7b9129cd86d4d76873734426b7044203bb389a2c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add organization access tokens; a new way to issue
  access tokens for performing actions with the CLI and doing usage reporting.

  **Breaking Change:** The `usage` service now requires environment variables for Postgres
  (`POSTGRES_SSL`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
  `POSTGRES_PASSWORD`) and Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`,
  `REDIS_TLS_ENABLED`).

  For more information please refer to the organization access token documentation.

  - [Product Update: Organization-Level Access Tokens for Enhanced Security & Flexibility](https://the-guild.dev/graphql/hive/product-updates/2025-03-10-new-access-tokens)
  - [Migration Guide: Moving from Registry Access Tokens to Access Tokens](https://the-guild.dev/graphql/hive/docs/migration-guides/organization-access-tokens)
  - [Access Token Documentation](https://the-guild.dev/graphql/hive/docs/management/access-tokens)

- [#6613](https://github.com/graphql-hive/console/pull/6613)
  [`0fd4d96`](https://github.com/graphql-hive/console/commit/0fd4d966ab6f01cd16a5716e1c33363ca5771127)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Restructure the environment variables used for the
  Hive Cloud hosting. While this is techincally a breaking change it will not really affect people
  self-hosting Hive.

  **Breaking**: Remove unused environment variable options `HIVE_REPORTING`,
  `HIVE_REPORTING_ENDPOINT` and `HIVE_USAGE_DATA_RETENTION_PURGE_INTERVAL_MINUTES` from the `server`
  service.

  These environment variables are obsolete since the Hive GraphQL schema is reported via the Hive
  CLI instead.

  **Breaking**: Replace the environment variable option `HIVE` with `HIVE_USAGE`, rename environment
  variable option `HIVE_API_TOKEN` to `HIVE_USAGE_ACCESS_TOKEN` for the `server` service. Require
  providing the `HIVE_USAGE_ACCESS_TOKEN` environment variable if `HIVE_USAGE` is set to `1`.

### Patch Changes

- [#6594](https://github.com/graphql-hive/console/pull/6594)
  [`06e7012`](https://github.com/graphql-hive/console/commit/06e70129689570f3602cd01eae4ef7f1dfe24f00)
  Thanks [@jdolle](https://github.com/jdolle)! - Fix insights range if selecting same start and end

- [#6633](https://github.com/graphql-hive/console/pull/6633)
  [`a5e00f2`](https://github.com/graphql-hive/console/commit/a5e00f260a6f21b3207fc8257c302e68a0d671b1)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix Federation composition error when having an
  inaccessible default value on an inaccessible field.

- [#6609](https://github.com/graphql-hive/console/pull/6609)
  [`1c44345`](https://github.com/graphql-hive/console/commit/1c4434522385c744bd484f7964d3c92f73f3641f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Mark usage-ingestor as unhealthy when
  Kafka consumer crashed

- [#6584](https://github.com/graphql-hive/console/pull/6584)
  [`d1e6ab0`](https://github.com/graphql-hive/console/commit/d1e6ab094b881a6ce08c55f68a8ecd6018c47613)
  Thanks [@jdolle](https://github.com/jdolle)! - Add readonly resource ID to settings pages

- [#6585](https://github.com/graphql-hive/console/pull/6585)
  [`c0d9ca3`](https://github.com/graphql-hive/console/commit/c0d9ca30d4c360e75be7902d2693303ffe622975)
  Thanks [@jdolle](https://github.com/jdolle)! - Restrict new service names to 64 characters,
  alphanumberic, `_` and `-`.

- [#6607](https://github.com/graphql-hive/console/pull/6607)
  [`18f82b4`](https://github.com/graphql-hive/console/commit/18f82b4e3fddb507f685cb85d48e3f42a87a0039)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Ensure all materialized views have
  correct TTL

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
