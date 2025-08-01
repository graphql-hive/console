# @graphql-hive/cli

## 0.50.3

### Patch Changes

- Updated dependencies
  [[`8d56b98`](https://github.com/graphql-hive/console/commit/8d56b9848028d65442cb1dada139f5a17d464f1b)]:
  - @graphql-hive/core@0.13.0

## 0.50.2

### Patch Changes

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

## 0.50.1

### Patch Changes

- Updated dependencies
  [[`bbd5643`](https://github.com/graphql-hive/console/commit/bbd5643924eb2b32511e96a03a3a5a978a66adee)]:
  - @graphql-hive/core@0.12.0

## 0.50.0

### Minor Changes

- [#6658](https://github.com/graphql-hive/console/pull/6658)
  [`e6a970f`](https://github.com/graphql-hive/console/commit/e6a970f790b388ff29f97709acdd73136a79dfb7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Internal adjustments for using non-deprecated API
  fields.

- [#6626](https://github.com/graphql-hive/console/pull/6626)
  [`2056307`](https://github.com/graphql-hive/console/commit/20563078449dbb6bf33bac3b2e5ac3d2c772fc6f)
  Thanks [@jdolle](https://github.com/jdolle)! - Show dangerous changes as a separate list in
  schema:check

- [#6662](https://github.com/graphql-hive/console/pull/6662)
  [`2b220a5`](https://github.com/graphql-hive/console/commit/2b220a560c4e4777a20ec0cf5f6ee68032055022)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support federation composition validation for
  `IMPLEMENTED_BY_INACCESSIBLE`.

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

### Patch Changes

- [#6768](https://github.com/graphql-hive/console/pull/6768)
  [`5ee3a2e`](https://github.com/graphql-hive/console/commit/5ee3a2e98c1de16d61b4a610123b5e7dbeb13304)
  Thanks [@jdolle](https://github.com/jdolle)! - Correct error exit codes

- Updated dependencies
  [[`5130fc1`](https://github.com/graphql-hive/console/commit/5130fc1db8c50ac0eb35d901623594749772c550)]:
  - @graphql-hive/core@0.11.0

## 0.49.1

### Patch Changes

- [#6633](https://github.com/graphql-hive/console/pull/6633)
  [`a5e00f2`](https://github.com/graphql-hive/console/commit/a5e00f260a6f21b3207fc8257c302e68a0d671b1)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix Federation composition error when having an
  inaccessible default value on an inaccessible field.

- [#6585](https://github.com/graphql-hive/console/pull/6585)
  [`c0d9ca3`](https://github.com/graphql-hive/console/commit/c0d9ca30d4c360e75be7902d2693303ffe622975)
  Thanks [@jdolle](https://github.com/jdolle)! - Restrict new service names to 64 characters,
  alphanumberic, `_` and `-`.

- Updated dependencies
  [[`ee70018`](https://github.com/graphql-hive/console/commit/ee7001883970fac81210ec21ce70a72bfd3b67bb),
  [`a003f78`](https://github.com/graphql-hive/console/commit/a003f781cb1a38d8b00a3256163c50e3893db5f2)]:
  - @graphql-hive/core@0.10.1

## 0.49.0

### Minor Changes

- [#6573](https://github.com/graphql-hive/console/pull/6573)
  [`3bf0598`](https://github.com/graphql-hive/console/commit/3bf05980759d90a9ab80aeb05a8fb0646af1b451)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Better error handling for missing `--target` option
  when required.

### Patch Changes

- [#6582](https://github.com/graphql-hive/console/pull/6582)
  [`bb2f2aa`](https://github.com/graphql-hive/console/commit/bb2f2aa30f6cd4a5427e7d977c816d7e78499ea2)
  Thanks [@jdolle](https://github.com/jdolle)! - Adds optional url argument to schema checks

- Updated dependencies
  [[`494697e`](https://github.com/graphql-hive/console/commit/494697e20f67ef877cd5dd63ccd29984c719ab44)]:
  - @graphql-hive/core@0.10.0

## 0.48.3

### Patch Changes

- [#6508](https://github.com/graphql-hive/console/pull/6508)
  [`716868b`](https://github.com/graphql-hive/console/commit/716868bae607f8ee0a800ade060010b2c9e144aa)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - No changes in this version

## 0.48.2

### Patch Changes

- [#6502](https://github.com/graphql-hive/console/pull/6502)
  [`cef7fd8`](https://github.com/graphql-hive/console/commit/cef7fd88e4929942bcaf07aaf3bc226c5d9a38cd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - **hive dev**

  Update @theguild/federation-composition to 0.14.4:

  - Fix a child data type field not being accessible via interfaceObject
  - Respect inaccessible enum values while creating the public schema from the supergraph AST

## 0.48.1

### Patch Changes

- Updated dependencies
  [[`ae2d16d`](https://github.com/graphql-hive/console/commit/ae2d16d553e264c813ac65d78eacab3d7a2efeae)]:
  - @graphql-hive/core@0.9.1

## 0.48.0

### Minor Changes

- [#6488](https://github.com/graphql-hive/console/pull/6488)
  [`f7d65fe`](https://github.com/graphql-hive/console/commit/f7d65feb5aaf4f4f86dfc0fe5df3ea4c3df1d7a8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Include and log a `x-request-id` header for all
  requests sent to the Hive API. This helps users to share more context with Hive staff when
  encountering errors.

### Patch Changes

- [#6483](https://github.com/graphql-hive/console/pull/6483)
  [`39eac03`](https://github.com/graphql-hive/console/commit/39eac0315c8ecb4fb55364d62c300f34dd5fdcab)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Show correct error message when attempting a schema
  check on a federation project without the `--service` paramater.
- Updated dependencies
  [[`f7d65fe`](https://github.com/graphql-hive/console/commit/f7d65feb5aaf4f4f86dfc0fe5df3ea4c3df1d7a8)]:
  - @graphql-hive/core@0.9.0

## 0.47.0

### Minor Changes

- [#6449](https://github.com/graphql-hive/console/pull/6449)
  [`0504530`](https://github.com/graphql-hive/console/commit/05045306b789e97ec39cbd2c8ee2b4f1b721dc9e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add `--target` flag for commands `app:create`,
  `app:publish`, `operations:check`, `schema:check`, `schema:delete`, `schema:fetch`,
  `schema:publish` and `dev`.

  The `--target` flag can be used to specify the target on which the operation should be performed.
  Either a slug or ID of the target can be provided.

  A provided slug must follow the format `$organizationSlug/$projectSlug/$targetSlug` (e.g.
  `the-guild/graphql-hive/staging`).

  **Example using target slug**

  ```bash
  hive schema:publish --target the-guild/graphql-hive/production ./my-schema.graphql
  ```

  A target id, must be a valid target UUID.

  **Example using target id**

  ```bash
  hive schema:publish --target a0f4c605-6541-4350-8cfe-b31f21a4bf80 ./my-schema.graphql
  ```

  **Note:** We encourage starting to use the `--target` flag today. In the future the flag will
  become mandatory as we are moving to a more flexible approach of access tokens that can be granted
  access to multiple targets.

## 0.46.1

### Patch Changes

- [#6380](https://github.com/graphql-hive/console/pull/6380)
  [`40213fb`](https://github.com/graphql-hive/console/commit/40213fb7dc39cfb2688e6127e8fe2658f7fceb7f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Update
  `@theguild/federation-composition` to
  [v0.14.3](https://github.com/the-guild-org/federation/releases/tag/v0.14.3)

- Updated dependencies
  [[`ec356a7`](https://github.com/graphql-hive/console/commit/ec356a7784d1f59722f80a69f501f1f250b2f6b2)]:
  - @graphql-hive/core@0.8.4

## 0.46.0

### Minor Changes

- [#6357](https://github.com/graphql-hive/console/pull/6357)
  [`e10cc2d`](https://github.com/graphql-hive/console/commit/e10cc2db4297dafabbbf4996d501384dd0884c4a)
  Thanks [@jasonkuhrt](https://github.com/jasonkuhrt)! - Add experimental json file flag to command
  `schema:check`.

  On the `schema:check` command, you can now use the flag
  `--experimental-json-file ./path/to/schema-check-result.json` to output a JSON file containing the
  command's result.

  This experimental feature is designed to help you with scripting, typically in CI/CD pipelines.

  Please note that this is an experimental feature, and therefore is:

  1. likely to change or be removed in a future version
  2. not covered by semantic versioning.

- [#6338](https://github.com/graphql-hive/console/pull/6338)
  [`f6565fc`](https://github.com/graphql-hive/console/commit/f6565fc8996922bfd657e83a8b53b8b473858154)
  Thanks [@jdolle](https://github.com/jdolle)! - cli schema:fetch targets latest if actionId
  argument is missing

- [#6333](https://github.com/graphql-hive/console/pull/6333)
  [`0a84187`](https://github.com/graphql-hive/console/commit/0a84187051ae121f06bacc6b99da96d81e775dcd)
  Thanks [@jasonkuhrt](https://github.com/jasonkuhrt)! - BREAKING: Remove config commands

  This prepares for the addition of JSON format output in other commands.

## 0.45.0

### Minor Changes

- [#6255](https://github.com/graphql-hive/console/pull/6255)
  [`29c45df`](https://github.com/graphql-hive/console/commit/29c45dfbfc8ab87e9e84fec9c8def41ba01c3fe8)
  Thanks [@jdolle](https://github.com/jdolle)! - Added subgraph type to schema:fetch cmd to print
  subgraph details

### Patch Changes

- [#6252](https://github.com/graphql-hive/console/pull/6252)
  [`5a6e565`](https://github.com/graphql-hive/console/commit/5a6e565be464983a5651a1349470415d3d93ba46)
  Thanks [@jdolle](https://github.com/jdolle)! - Print a detailed error when a command is executed
  without a hive access token

- Updated dependencies
  [[`039c66b`](https://github.com/graphql-hive/console/commit/039c66bd24d4339e56b4e1e1fc7f8fa68de7e954)]:
  - @graphql-hive/core@0.8.3

## 0.44.5

### Patch Changes

- [#6224](https://github.com/graphql-hive/console/pull/6224)
  [`592d3b3`](https://github.com/graphql-hive/console/commit/592d3b34551e27bf0d0993609ad0ad2d7ea7104c)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Extends debug information. Prints a
  list of files of the script directory and a path of included node binary. To enable debug mode,
  pass DEBUG=1 environment variable when running the CLI.

## 0.44.4

### Patch Changes

- [#6057](https://github.com/graphql-hive/console/pull/6057)
  [`e4f8b0a`](https://github.com/graphql-hive/console/commit/e4f8b0a51d1158da966a719f321bc13e5af39ea0)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Explain what Hive is in README

## 0.44.3

### Patch Changes

- [#5872](https://github.com/graphql-hive/platform/pull/5872)
  [`580d349`](https://github.com/graphql-hive/platform/commit/580d349d45b85dc6103b39c6e07bc3d81e5d3bc9)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump @theguild/federation-composition
  to v0.14.1

## 0.44.2

### Patch Changes

- Updated dependencies
  [[`c728803`](https://github.com/graphql-hive/platform/commit/c7288038f24c0214b4023994f306c6229c1ce72c)]:
  - @graphql-hive/core@0.8.2

## 0.44.1

### Patch Changes

- Updated dependencies
  [[`be5d39c`](https://github.com/kamilkisiela/graphql-hive/commit/be5d39cbf08d0681d142e83a708d300abc504c44)]:
  - @graphql-hive/core@0.8.1

## 0.44.0

### Minor Changes

- [#5661](https://github.com/kamilkisiela/graphql-hive/pull/5661)
  [`ed25aca`](https://github.com/kamilkisiela/graphql-hive/commit/ed25aca53a0c064adf50d13b0aa3407028d72049)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Improve error output for rejected app deployment
  creation. The CLI now shows which operation is affected and the reason for the failed upload.

## 0.43.0

### Minor Changes

- [#5474](https://github.com/kamilkisiela/graphql-hive/pull/5474)
  [`3850ad2`](https://github.com/kamilkisiela/graphql-hive/commit/3850ad24d421631a56676cc1bff5d0c4a3d28a49)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Introduce schema publish retries, when being
  blocked by other concurrent schema publishes.

## 0.42.1

### Patch Changes

- Updated dependencies
  [[`3ffdb6e`](https://github.com/kamilkisiela/graphql-hive/commit/3ffdb6e9466deb3c3aa09eea1445fc4caf698fd5)]:
  - @graphql-hive/core@0.8.0

## 0.42.0

### Minor Changes

- [#5190](https://github.com/kamilkisiela/graphql-hive/pull/5190)
  [`7039d83`](https://github.com/kamilkisiela/graphql-hive/commit/7039d83b943c05fbb289f391ff9be0ae0da720f1)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - add support for app deployments

### Patch Changes

- Updated dependencies
  [[`a896642`](https://github.com/kamilkisiela/graphql-hive/commit/a896642197e6d7779ba7ed71f365dfbd80532282)]:
  - @graphql-hive/core@0.7.1

## 0.41.0

### Minor Changes

- [#5307](https://github.com/kamilkisiela/graphql-hive/pull/5307)
  [`0a3b24d`](https://github.com/kamilkisiela/graphql-hive/commit/0a3b24d400770c2cc84642959febb9288ad1c1b7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Re-introduce retry logging removed in previous
  release.

### Patch Changes

- Updated dependencies
  [[`3f03e7b`](https://github.com/kamilkisiela/graphql-hive/commit/3f03e7b3a65707ba8aa04335684f0aa8d261868f),
  [`0a3b24d`](https://github.com/kamilkisiela/graphql-hive/commit/0a3b24d400770c2cc84642959febb9288ad1c1b7)]:
  - @graphql-hive/core@0.7.0

## 0.40.1

### Patch Changes

- [#5304](https://github.com/kamilkisiela/graphql-hive/pull/5304)
  [`f2fef08`](https://github.com/kamilkisiela/graphql-hive/commit/f2fef08e9d1e13cb4a89d3882922db6dc822542e)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fixed a logging issue where both
  initiated requests and successful responses were being recorded. This was causing the logs to be
  filled with unnecessary information and affected `hive artifact:fetch --artifact` command.

- Updated dependencies
  [[`f2fef08`](https://github.com/kamilkisiela/graphql-hive/commit/f2fef08e9d1e13cb4a89d3882922db6dc822542e)]:
  - @graphql-hive/core@0.6.1

## 0.40.0

### Minor Changes

- [#5234](https://github.com/kamilkisiela/graphql-hive/pull/5234)
  [`e6dc5c9`](https://github.com/kamilkisiela/graphql-hive/commit/e6dc5c9df34c30c52555b27b0bca50e0be75480b)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Provide debug logging for HTTP requests when
  providing the `--debug` flag.

### Patch Changes

- Updated dependencies
  [[`e6dc5c9`](https://github.com/kamilkisiela/graphql-hive/commit/e6dc5c9df34c30c52555b27b0bca50e0be75480b)]:
  - @graphql-hive/core@0.6.0

## 0.39.0

### Minor Changes

- [#5237](https://github.com/kamilkisiela/graphql-hive/pull/5237)
  [`c20907b`](https://github.com/kamilkisiela/graphql-hive/commit/c20907b7bf04a0289370e104f5c00371b71813a3)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Changes the default behavior of
  `hive dev` command. Now schema composition is done locally, without substituting subgraphs
  available in the registry.

  We added `--remote` flag to the `hive dev` command to mimic the previous behavior.

  **Breaking Change** The `$ hive dev` command is still a work in progress (as stated in the command
  description). That's why we are not considering this a breaking change, but a minor change.

  **_Before:_**

  The `hive dev` command would substitute subgraphs available in the registry with their local
  counterparts, performing schema composition over the network according to your project's
  configuration.

  **_After:_**

  The `hive dev` command will now perform schema composition locally, without substituting subgraphs
  available in the registry. This is the default behavior.

  To mimic the previous behavior, you can apply the `--remote` flag and continue using the command
  as before.

## 0.38.5

### Patch Changes

- Updated dependencies
  [[`f1e43c6`](https://github.com/kamilkisiela/graphql-hive/commit/f1e43c641f3ebac931839c7dfbdcb3a885167562)]:
  - @graphql-hive/core@0.5.0

## 0.38.4

### Patch Changes

- [#5097](https://github.com/kamilkisiela/graphql-hive/pull/5097)
  [`b8998e7`](https://github.com/kamilkisiela/graphql-hive/commit/b8998e7ead84a2714d13678aaf1e349e648eb90a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Retry up to 3 times a GET request in
  the artifact:fetch command

- Updated dependencies
  [[`b8998e7`](https://github.com/kamilkisiela/graphql-hive/commit/b8998e7ead84a2714d13678aaf1e349e648eb90a)]:
  - @graphql-hive/core@0.4.0

## 0.38.3

### Patch Changes

- Updated dependencies
  [[`cbc8364`](https://github.com/kamilkisiela/graphql-hive/commit/cbc836488b4acfb618fd877005ecf0126f1706b6)]:
  - @graphql-hive/core@0.3.1

## 0.38.2

### Patch Changes

- [#4814](https://github.com/kamilkisiela/graphql-hive/pull/4814)
  [`15a8c54`](https://github.com/kamilkisiela/graphql-hive/commit/15a8c548dbdf71b825a804d59b88b4a2e7dbf765)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - No changes

## 0.38.1

### Patch Changes

- [#4812](https://github.com/kamilkisiela/graphql-hive/pull/4812)
  [`8497c2e`](https://github.com/kamilkisiela/graphql-hive/commit/8497c2e3f57359816059839f58ba6f4cfdad210f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - No changes

## 0.38.0

### Minor Changes

- [#4807](https://github.com/kamilkisiela/graphql-hive/pull/4807)
  [`44b80b2`](https://github.com/kamilkisiela/graphql-hive/commit/44b80b27ab9f0eef85f6454e34e079e98ee0f2bd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Upgrade to Oclif v3

## 0.37.0

### Minor Changes

- [#4494](https://github.com/kamilkisiela/graphql-hive/pull/4494)
  [`c5eeac5`](https://github.com/kamilkisiela/graphql-hive/commit/c5eeac5ccef9e2dcc3c8bb33deec0fb95af9552e)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - 🚨 BREAKING CHANGE 🚨 Requires now Node
  v16+

### Patch Changes

- Updated dependencies
  [[`06d465e`](https://github.com/kamilkisiela/graphql-hive/commit/06d465e882b569b6d0dbd5b271d2d98aafaec0b1),
  [`c5eeac5`](https://github.com/kamilkisiela/graphql-hive/commit/c5eeac5ccef9e2dcc3c8bb33deec0fb95af9552e)]:
  - @graphql-hive/core@0.3.0

## 0.36.0

### Minor Changes

- [#4519](https://github.com/kamilkisiela/graphql-hive/pull/4519)
  [`08d8706`](https://github.com/kamilkisiela/graphql-hive/commit/08d87069541543d81a4ca59c7dd2091fce357790)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - No longer show dangerous changes

## 0.35.0

### Minor Changes

- [#4383](https://github.com/kamilkisiela/graphql-hive/pull/4383)
  [`ff480e9`](https://github.com/kamilkisiela/graphql-hive/commit/ff480e917337b3dd0c7eb3a51254ca2bac8bddcd)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Introducing `hive dev` command -
  compose local subgraphs with subgraphs from the registry.

## 0.34.1

### Patch Changes

- [#4328](https://github.com/kamilkisiela/graphql-hive/pull/4328)
  [`bb0ff23`](https://github.com/kamilkisiela/graphql-hive/commit/bb0ff238ee7a413aca618b05cdf2187e6b886188)
  Thanks [@Hebilicious](https://github.com/Hebilicious)! - Use node specifier for crypto import

- Updated dependencies
  [[`bb0ff23`](https://github.com/kamilkisiela/graphql-hive/commit/bb0ff238ee7a413aca618b05cdf2187e6b886188)]:
  - @graphql-hive/core@0.2.4

## 0.34.0

### Minor Changes

- [#3504](https://github.com/kamilkisiela/graphql-hive/pull/3504)
  [`cd12710`](https://github.com/kamilkisiela/graphql-hive/commit/cd1271088a321545fe8884658fd2c19649c3a4f6)
  Thanks [@beerose](https://github.com/beerose)! - Show which breaking changes are safe on usage

## 0.33.1

### Patch Changes

- [#3862](https://github.com/kamilkisiela/graphql-hive/pull/3862)
  [`02f5274`](https://github.com/kamilkisiela/graphql-hive/commit/02f52748508dfe70eb8ec500a442bfc5aecba34e)
  Thanks [@kongMina](https://github.com/kongMina)! - Separated schema check changes in CLI output

## 0.33.0

### Minor Changes

- [#3543](https://github.com/kamilkisiela/graphql-hive/pull/3543)
  [`6895ee3`](https://github.com/kamilkisiela/graphql-hive/commit/6895ee3ebf6a18c246b2f974f2cbb338887c97e7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Support Apollo Client directives in
  operations:check command (pass --apolloClient flag)

## 0.32.1

### Patch Changes

- [#3529](https://github.com/kamilkisiela/graphql-hive/pull/3529)
  [`1615ad4`](https://github.com/kamilkisiela/graphql-hive/commit/1615ad4fb681e617d1ac217a3e96484c4f4ca89f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - fix: use Hive Cloud as a default value
  for registry.endpoint

## 0.32.0

### Minor Changes

- [`00520b9`](https://github.com/kamilkisiela/graphql-hive/commit/00520b9c3eaa028241bee8b3202ebc07a82cdf5f)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Print warning when pull request number can not be
  resolved.

## 0.31.0

### Minor Changes

- [#3359](https://github.com/kamilkisiela/graphql-hive/pull/3359)
  [`21d246d`](https://github.com/kamilkisiela/graphql-hive/commit/21d246d815c63f4892f0490cff81b1c25c5f1d32)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Associate schema checks with context ID for
  remembering approved breaking schema changes for subsequent schema checks when running the
  `schema:check` command.

  If you are using the `--github` flag, all you need to do is to upgrade to this version. The
  `context` will be automatically be the pull request scope.

  On pull request branch GitHub Action:

  ```bash
  hive schema:check --github ./my-schema.graphql
  ```

  If you are not using GitHub Repositories and Actions, you can manually provide a context ID with
  the `--contextId` flag.

  ```bash
  hive schema:check --contextId "pull-request-69" ./my-schema.graphql
  ```

  [Learn more in the product update.](https://the-guild.dev/graphql/hive/product-updates/2023-11-16-schema-check-breaking-change-approval-context)

## 0.30.4

### Patch Changes

- [#1716](https://github.com/kamilkisiela/graphql-hive/pull/1716)
  [`f79fcf2`](https://github.com/kamilkisiela/graphql-hive/commit/f79fcf27d624350a52de6599677d46adb52ea835)
  Thanks [@dimaMachina](https://github.com/dimaMachina)! - Drop `graphql-request` dependency

## 0.30.3

### Patch Changes

- [#3240](https://github.com/kamilkisiela/graphql-hive/pull/3240)
  [`6b7aef8b`](https://github.com/kamilkisiela/graphql-hive/commit/6b7aef8b708690c5b5944c567b25210672325678)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Remove `Access to operation:publish`
  information from CLI command "whoami" (unused)

## 0.30.2

### Patch Changes

- [#3045](https://github.com/kamilkisiela/graphql-hive/pull/3045)
  [`925b943e`](https://github.com/kamilkisiela/graphql-hive/commit/925b943e4ae2ca79cde45acc8c723cb9b51caa7a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix [: /bin: unexpected operator on
  POSIX

## 0.30.1

### Patch Changes

- [#3042](https://github.com/kamilkisiela/graphql-hive/pull/3042)
  [`eeaec3fb`](https://github.com/kamilkisiela/graphql-hive/commit/eeaec3fb0fc9b7e86ed44437726481a8b61d688d)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix command != not found

## 0.30.0

### Minor Changes

- [#2701](https://github.com/kamilkisiela/graphql-hive/pull/2701)
  [`fdf71a1c`](https://github.com/kamilkisiela/graphql-hive/commit/fdf71a1c8cd100434960fb044264465db4704efd)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support forwarding GitHub repository information
  for schema checks and schema publishes when using the `--github` flag.

  Please upgrade if you want to correctly forward the information for (federated) subgraphs to the
  Hive registry.

## 0.29.0

### Minor Changes

- [#2569](https://github.com/kamilkisiela/graphql-hive/pull/2569)
  [`5bef13b`](https://github.com/kamilkisiela/graphql-hive/commit/5bef13b15e05b639c76ea7d847045d017a12c8a7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Add ability to identify non-standard
  template litarls in operations:check command

## 0.28.0

### Minor Changes

- [#2720](https://github.com/kamilkisiela/graphql-hive/pull/2720)
  [`79227f8`](https://github.com/kamilkisiela/graphql-hive/commit/79227f86bd7c03730cd752a8ecdcefca2f714c2e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fetch a specific schema sdl or supergraph from the
  API using the action id (commit sha) with the `hive schema:fetch` command.

  Example:

  ```bash
  hive schema:fetch 99dad865e1d710b359049f52be0b018 -T supergraph -W supergraph.graphql
  ```

## 0.27.1

### Patch Changes

- [#2723](https://github.com/kamilkisiela/graphql-hive/pull/2723)
  [`2a13ed4`](https://github.com/kamilkisiela/graphql-hive/commit/2a13ed498a46f6647bfbc7d583bcb75ddf81a774)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Add missing exit(1)

- [#2723](https://github.com/kamilkisiela/graphql-hive/pull/2723)
  [`2a13ed4`](https://github.com/kamilkisiela/graphql-hive/commit/2a13ed498a46f6647bfbc7d583bcb75ddf81a774)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fix empty error list when running
  operations:check command (cause of the issue: GraphQL Inspector returns both errors and
  deprecation warnings)

## 0.27.0

### Minor Changes

- [#2697](https://github.com/kamilkisiela/graphql-hive/pull/2697)
  [`0475ca9`](https://github.com/kamilkisiela/graphql-hive/commit/0475ca9ea8d5b317c7764a5d666eaf3d7f36a3e1)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds introspect command

## 0.26.0

### Minor Changes

- [#2568](https://github.com/kamilkisiela/graphql-hive/pull/2568)
  [`9a205952`](https://github.com/kamilkisiela/graphql-hive/commit/9a2059524c4f09f576b2c5dd33687113c94aadd8)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Remove experimental operations:publish
  command

- [#2568](https://github.com/kamilkisiela/graphql-hive/pull/2568)
  [`9a205952`](https://github.com/kamilkisiela/graphql-hive/commit/9a2059524c4f09f576b2c5dd33687113c94aadd8)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Use latest composable schema in
  operations:check command

### Patch Changes

- [#2594](https://github.com/kamilkisiela/graphql-hive/pull/2594)
  [`c10e1250`](https://github.com/kamilkisiela/graphql-hive/commit/c10e1250096d4ffae04696e6d2a9a9299da10974)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - prevent reading a key of undefined
  value from config file

## 0.25.1

### Patch Changes

- [#2557](https://github.com/kamilkisiela/graphql-hive/pull/2557)
  [`1a1aae6`](https://github.com/kamilkisiela/graphql-hive/commit/1a1aae63b6b22c9484eaa559375e1de35b8152b7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Hide deprecation warning when --force
  is not provided by user

## 0.25.0

### Minor Changes

- [#2544](https://github.com/kamilkisiela/graphql-hive/pull/2544)
  [`f6510317`](https://github.com/kamilkisiela/graphql-hive/commit/f6510317be6a79456a982116ca3ff13866f5c68e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - print web schema check url when running
  `hive schema:check`.

## 0.24.0

### Minor Changes

- [#2378](https://github.com/kamilkisiela/graphql-hive/pull/2378)
  [`05b37a88`](https://github.com/kamilkisiela/graphql-hive/commit/05b37a885e347c3a9eb33235d48150770fb168eb)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Support HIVE_AUTHOR and HIVE_COMMIT env
  vars

### Patch Changes

- [#2378](https://github.com/kamilkisiela/graphql-hive/pull/2378)
  [`05b37a88`](https://github.com/kamilkisiela/graphql-hive/commit/05b37a885e347c3a9eb33235d48150770fb168eb)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds windows installer

## 0.23.0

### Minor Changes

- [#2430](https://github.com/kamilkisiela/graphql-hive/pull/2430)
  [`951f6865`](https://github.com/kamilkisiela/graphql-hive/commit/951f686506d003382658ddeb25a780fb194b65d4)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Use lighter solution to get commit sha
  and author from git

## 0.22.0

### Minor Changes

- [#1730](https://github.com/kamilkisiela/graphql-hive/pull/1730)
  [`9238a1f9`](https://github.com/kamilkisiela/graphql-hive/commit/9238a1f91594923abd171c3ec2029c3eb1265055)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Added support for new warnings feature
  during `schema:check` commands

## 0.21.0

### Minor Changes

- [#2080](https://github.com/kamilkisiela/graphql-hive/pull/2080)
  [`331a1116`](https://github.com/kamilkisiela/graphql-hive/commit/331a11165e88416e9f0e138704f2dab1fb384e05)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Introduce new config file format. Please move the
  `accessToken` property to a `registry` object.

  The old top-level property approach is now considered deprecated and will no longer be supported
  in the next major version of the CLI.

  ```diff
   {
  -  "accessToken": "xxxxxd4cxxx980xxxxf3099efxxxxx"
  +  "registry": {
  +      "accessToken": "xxxxxd4cxxx980xxxxf3099efxxxxx"
  +  }
   }
  ```

- [#2080](https://github.com/kamilkisiela/graphql-hive/pull/2080)
  [`331a1116`](https://github.com/kamilkisiela/graphql-hive/commit/331a11165e88416e9f0e138704f2dab1fb384e05)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Support fetching artifacts from the CDN with
  `hive artifact:fetch`.

  See the readme for more information.

### Patch Changes

- [#1461](https://github.com/kamilkisiela/graphql-hive/pull/1461)
  [`f66f6714`](https://github.com/kamilkisiela/graphql-hive/commit/f66f6714d5841620d8fa224b67907c534e21470b)
  Thanks [@renovate](https://github.com/apps/renovate)! - Update oclif@3.7.0

## 0.20.2

### Patch Changes

- [#1326](https://github.com/kamilkisiela/graphql-hive/pull/1326)
  [`99f7c66a`](https://github.com/kamilkisiela/graphql-hive/commit/99f7c66a44dc0ff5d209fdfcd5d9620dcd51171a)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Do not show "Skipping" when publishing
  schema to the modern model

## 0.20.1

### Patch Changes

- [`3688d09a`](https://github.com/kamilkisiela/graphql-hive/commit/3688d09ab4421b4dc3d16e866ec1e1f6dc91bffc)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Update README

## 0.20.0

### Minor Changes

- [`854e22fb`](https://github.com/kamilkisiela/graphql-hive/commit/854e22fbe4e3fe2f3d3f5442c15d987a357845e7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds `schema:delete` command

### Patch Changes

- [#1261](https://github.com/kamilkisiela/graphql-hive/pull/1261)
  [`ce829b50`](https://github.com/kamilkisiela/graphql-hive/commit/ce829b50721175181d5f945c392cd1a8b51a85df)
  Thanks [@renovate](https://github.com/apps/renovate)! - update oclif

## 0.19.12

### Patch Changes

- [#1047](https://github.com/kamilkisiela/graphql-hive/pull/1047)
  [`8c2cc65b`](https://github.com/kamilkisiela/graphql-hive/commit/8c2cc65b9489278196905a6e42056641de002230)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump

## 0.19.11

### Patch Changes

- [#904](https://github.com/kamilkisiela/graphql-hive/pull/904)
  [`20edc8c5`](https://github.com/kamilkisiela/graphql-hive/commit/20edc8c5e54cd71a726f02f33f9710460fc6d5a0)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Upgrade dependency git-parse to v3

- [#909](https://github.com/kamilkisiela/graphql-hive/pull/909)
  [`9a4a69bb`](https://github.com/kamilkisiela/graphql-hive/commit/9a4a69bb83760bf8e83961cc0a878899f7715da7)
  Thanks [@dotansimha](https://github.com/dotansimha)! - Upgrade oclif to latest version

- [#930](https://github.com/kamilkisiela/graphql-hive/pull/930)
  [`a972fe26`](https://github.com/kamilkisiela/graphql-hive/commit/a972fe26f2c3624dd4e66b36edf91ce3dbae78c7)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Support nullable Query.latestVersion

## 0.19.10

### Patch Changes

- Updated dependencies
  [[`e116841`](https://github.com/kamilkisiela/graphql-hive/commit/e116841a739bfd7f37c4a826544301cf23d61637)]:
  - @graphql-hive/core@0.2.3

## 0.19.9

### Patch Changes

- [#655](https://github.com/kamilkisiela/graphql-hive/pull/655)
  [`2cbf27f`](https://github.com/kamilkisiela/graphql-hive/commit/2cbf27fdc9c18749b8969adb6d1598338762dba2)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add User-Agent header to all http requests

## 0.19.8

### Patch Changes

- [#648](https://github.com/kamilkisiela/graphql-hive/pull/648)
  [`84a78fc`](https://github.com/kamilkisiela/graphql-hive/commit/84a78fc2a4061e05b1bbe4a8d11006601c767384)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - bump

## 0.19.7

### Patch Changes

- [#646](https://github.com/kamilkisiela/graphql-hive/pull/646)
  [`65f3372`](https://github.com/kamilkisiela/graphql-hive/commit/65f3372dfa047238352beee113ccb8506cc180ca)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - I hope it's final bump

## 0.19.6

### Patch Changes

- [#645](https://github.com/kamilkisiela/graphql-hive/pull/645)
  [`7110555`](https://github.com/kamilkisiela/graphql-hive/commit/71105559b67f510087223ada2af23564ff053353)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Ignore npm-shrinkwrap.json

## 0.19.5

### Patch Changes

- [#641](https://github.com/kamilkisiela/graphql-hive/pull/641)
  [`ce55b72`](https://github.com/kamilkisiela/graphql-hive/commit/ce55b724b00ff7fc93f3df4089e698e6f9d5086b)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Do not include npm-shrinkwrap.json

## 0.19.4

### Patch Changes

- [#631](https://github.com/kamilkisiela/graphql-hive/pull/631)
  [`d4ca981`](https://github.com/kamilkisiela/graphql-hive/commit/d4ca98180bd0b2910fb41f623c2f5abb1f4b9214)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump

- [#631](https://github.com/kamilkisiela/graphql-hive/pull/631)
  [`d4ca981`](https://github.com/kamilkisiela/graphql-hive/commit/d4ca98180bd0b2910fb41f623c2f5abb1f4b9214)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump CLI

## 0.19.3

### Patch Changes

- [#629](https://github.com/kamilkisiela/graphql-hive/pull/629)
  [`750b46d`](https://github.com/kamilkisiela/graphql-hive/commit/750b46d155c5d01ad4b3cee84409793736246603)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump

## 0.19.2

### Patch Changes

- [#627](https://github.com/kamilkisiela/graphql-hive/pull/627)
  [`78096dc`](https://github.com/kamilkisiela/graphql-hive/commit/78096dcfbd37059fbb309e8faa6bae1d14e18c79)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - bump

## 0.19.1

### Patch Changes

- [#466](https://github.com/kamilkisiela/graphql-hive/pull/466)
  [`2e036ac`](https://github.com/kamilkisiela/graphql-hive/commit/2e036acc4ce1c27a493e90481bb10f5886c0a00c)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphQL Tools packages

## 0.19.0

### Minor Changes

- [#357](https://github.com/kamilkisiela/graphql-hive/pull/357)
  [`30f11c4`](https://github.com/kamilkisiela/graphql-hive/commit/30f11c40054debfcbd8b6090316d129eb7851046)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Adds experimental_acceptBreakingChanges

## 0.18.2

### Patch Changes

- [#292](https://github.com/kamilkisiela/graphql-hive/pull/292)
  [`efb03e1`](https://github.com/kamilkisiela/graphql-hive/commit/efb03e184d5a878dbcca83295b2d1d53b3c9f8e3)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Bump @oclif/core dependency range to
  ^1.13.10

## 0.18.1

### Patch Changes

- 41ec31b: Update GraphQL Inspector range to ~3.2.0

## 0.18.0

### Minor Changes

- 25d6b01: Migrate to Authorization header (previously X-API-Token)

### Patch Changes

- 8035861: Better error messages for SDL syntax errors.

## 0.17.0

### Minor Changes

- ae6ae2f: Print link to the website when publishing new schema
- fa5045f: Use graphql@^16.0.0 as direct dependency

## 0.16.0

### Minor Changes

- 23eb4cc: Add message about empty schema registry in schema:check

## 0.15.0

### Minor Changes

- 5de7e38: Support SchemaPublishMissingUrlError type

## 0.14.6

### Patch Changes

- ce343ac: Bump

## 0.14.5

### Patch Changes

- ad66973: Bump
- Updated dependencies [ad66973]
  - @graphql-hive/core@0.2.2

## 0.14.4

### Patch Changes

- 0a5dbeb: Point to graphql-hive.com
- Updated dependencies [0a5dbeb]
  - @graphql-hive/core@0.2.1

## 0.14.3

### Patch Changes

- 9e487129: Bump

## 0.14.2

### Patch Changes

- c87df3ad: Bump

## 0.14.1

### Patch Changes

- 11958e9d: Add update command to self-update Hive CLI

## 0.14.0

### Minor Changes

- 6290ec23: Introduce operations:check to validate GraphQL Operations against latest schema
- 6290ec23: Rename operation:publish command to operations:publish

## 0.13.0

### Minor Changes

- d5db6070: Support URLs

## 0.12.0

### Minor Changes

- d9fbd878: Add --github flag to schema:publish command

## 0.11.0

### Minor Changes

- ac9b868c: Support GraphQL v16
- e03185a7: GitHub Application

### Patch Changes

- Updated dependencies [ac9b868c]
  - @graphql-hive/core@0.2.0

## 0.10.0

### Minor Changes

- c5bfa4c9: Add a new `metadata` flag for publishing schema metadata (JSON) to Hive.

  The `--metadata` can contain anything you wish to have attached to your GraphQL schema, and can
  support your runtime needs.

  You can either specify a path to a file: `--metadata my-file.json`, or an inline JSON object:
  `--metadata '{"test": 1}'`.

  Metadata published to Hive will be available as part of Hive CDN, under `/metadata` route.

## 0.9.6

### Patch Changes

- 903edf84: Bump

## 0.9.5

### Patch Changes

- ccb93298: Remove content-encoding header and improve error logs

## 0.9.4

### Patch Changes

- 28bc8af3: Fix version header

## 0.9.3

### Patch Changes

- 3a435baa: Show one value of x-request-id

## 0.9.2

### Patch Changes

- 79d4b4c2: fix(deps): update envelop monorepo

## 0.9.1

### Patch Changes

- 016dd92c: handle missing service name argument for federation and stitching projects

## 0.9.0

### Minor Changes

- 7eca7f0: Display access to commands

## 0.8.1

### Patch Changes

- 273f096: show registry url

## 0.8.0

### Minor Changes

- 91a6957: Allow to update url of a service

## 0.7.0

### Minor Changes

- 6f204be: Display token info

## 0.6.4

### Patch Changes

- 52ab1f2: Find .git directory when CLI is installed globally

## 0.6.3

### Patch Changes

- 73a840d: Warn about missing git and make git optional

## 0.6.2

### Patch Changes

- df6c501: Do not exit with 0 when forceSafe

## 0.6.1

### Patch Changes

- aff0857: Throw on empty schema and use x-request-id as reference

## 0.6.0

### Minor Changes

- 4647d25: Add --forceSafe flag to mark the check as non-breaking regardless of breaking changes

## 0.5.0

### Minor Changes

- 0e712c7: Update normalization logic

### Patch Changes

- 0e712c7: Support --url

## 0.4.9

### Patch Changes

- Updated dependencies [d7348a3]
- Updated dependencies [d7348a3]
  - @graphql-hive/core@0.1.0

## 0.4.8

### Patch Changes

- 6214042: Fix auto-update error related to oclif

## 0.4.7

### Patch Changes

- bda322c: Add --require flag and normalize schema printing

## 0.4.6

### Patch Changes

- 5aa5e93: Bump

## 0.4.5

### Patch Changes

- 968614d: Fix persisting the same query twice
- 968614d: Add auto-updates and new-version warnings

## 0.4.4

### Patch Changes

- 1a16360: Send GraphQL Client name and version

## 0.4.3

### Patch Changes

- 41a9117: Fix an issue when publishing a schema for the first time

## 0.4.2

### Patch Changes

- c6ef3d2: Bob update
- 4224cb9: Support HIVE\_\* env variables
- Updated dependencies [c6ef3d2]
  - @graphql-hive/core@0.0.5

## 0.4.1

### Patch Changes

- aa12cdc: Use process.cwd()
- aa12cdc: Use HIVE_SPACE instead of REGISTRY_KEY env var

## 0.4.0

### Minor Changes

- e8dc8c6: Move file to be an argument, fix config

## 0.3.2

### Patch Changes

- 85b85d4: Dependencies update, cleanup, ui fixes

## 0.3.1

### Patch Changes

- Updated dependencies [4a7c569]
  - @graphql-hive/core@0.0.4

## 0.3.0

### Minor Changes

- 34cff78: Added support for specifying multiple configs in hive json file

## 0.2.1

### Patch Changes

- e257a0d: Support relay-like outputs of persisted operations
- bb5b3c4: Preparations for persisted operations in Lance

## 0.2.0

### Minor Changes

- acab74b: Added support for persisted operations - Changes made in API, APP, CLI, Server, Storage

## 0.1.1

### Patch Changes

- 79fe734: Set default registry url

## 0.1.0

### Minor Changes

- 078e758: Token per Target
- 1dd9cdb: --file flag is now replaced with a positional arg at the end, comments in graphql sdl
  files are now converted to descriptions, docs are updated to mention wildcard file uploads

### Patch Changes

- 60cd35d: Use default endpoint

## 0.0.5

### Patch Changes

- d433269: Fixes

## 0.0.4

### Patch Changes

- d64a3c5: Target 2017

## 0.0.3

### Patch Changes

- 7e88e71: bump

## 0.0.2

### Patch Changes

- b2d686e: bump
