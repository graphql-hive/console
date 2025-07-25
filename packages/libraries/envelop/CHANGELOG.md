# @graphql-hive/envelop

## 0.36.2

### Patch Changes

- Updated dependencies
  [[`8d56b98`](https://github.com/graphql-hive/console/commit/8d56b9848028d65442cb1dada139f5a17d464f1b)]:
  - @graphql-hive/core@0.13.0

## 0.36.1

### Patch Changes

- Updated dependencies
  [[`bbd5643`](https://github.com/graphql-hive/console/commit/bbd5643924eb2b32511e96a03a3a5a978a66adee)]:
  - @graphql-hive/core@0.12.0

## 0.36.0

### Minor Changes

- [#6637](https://github.com/graphql-hive/console/pull/6637)
  [`5130fc1`](https://github.com/graphql-hive/console/commit/5130fc1db8c50ac0eb35d901623594749772c550)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add error logging for invalid combinations of the
  `target` and `token` configuration.

  - Please make sure to provide the `target` option for usage reporting when using a token that
    starts with `hvo1/`.
  - Please make sure to **not** provide a `target` option for usage reporting when a token does
    **not** start with `hvo1/`

### Patch Changes

- Updated dependencies
  [[`5130fc1`](https://github.com/graphql-hive/console/commit/5130fc1db8c50ac0eb35d901623594749772c550)]:
  - @graphql-hive/core@0.11.0

## 0.35.1

### Patch Changes

- Updated dependencies
  [[`ee70018`](https://github.com/graphql-hive/console/commit/ee7001883970fac81210ec21ce70a72bfd3b67bb),
  [`a003f78`](https://github.com/graphql-hive/console/commit/a003f781cb1a38d8b00a3256163c50e3893db5f2)]:
  - @graphql-hive/core@0.10.1

## 0.35.0

### Minor Changes

- [#6574](https://github.com/graphql-hive/console/pull/6574)
  [`494697e`](https://github.com/graphql-hive/console/commit/494697e20f67ef877cd5dd63ccd29984c719ab44)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Add support for providing a target for usage
  reporting with organization access tokens. This can either be a slug following the format
  `$organizationSlug/$projectSlug/$targetSlug` (e.g `the-guild/graphql-hive/staging`) or an UUID
  (e.g. `a0f4c605-6541-4350-8cfe-b31f21a4bf80`)

  ```ts
  import { useHive } from '@graphql-hive/envelop'

  const hivePlugin = useHive({
    enabled: true,
    token: 'ORGANIZATION_ACCESS_TOKEN',
    usage: {
      target: 'my-org/my-project/my-target'
    }
  })
  ```

### Patch Changes

- Updated dependencies
  [[`494697e`](https://github.com/graphql-hive/console/commit/494697e20f67ef877cd5dd63ccd29984c719ab44)]:
  - @graphql-hive/core@0.10.0

## 0.34.1

### Patch Changes

- Updated dependencies
  [[`ae2d16d`](https://github.com/graphql-hive/console/commit/ae2d16d553e264c813ac65d78eacab3d7a2efeae)]:
  - @graphql-hive/core@0.9.1

## 0.34.0

### Minor Changes

- [#6488](https://github.com/graphql-hive/console/pull/6488)
  [`f7d65fe`](https://github.com/graphql-hive/console/commit/f7d65feb5aaf4f4f86dfc0fe5df3ea4c3df1d7a8)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Include and log a `x-request-id` header for all
  requests sent to the Hive API. This helps users to share more context with Hive staff when
  encountering errors.

### Patch Changes

- Updated dependencies
  [[`f7d65fe`](https://github.com/graphql-hive/console/commit/f7d65feb5aaf4f4f86dfc0fe5df3ea4c3df1d7a8)]:
  - @graphql-hive/core@0.9.0

## 0.33.13

### Patch Changes

- [#6383](https://github.com/graphql-hive/console/pull/6383)
  [`ec356a7`](https://github.com/graphql-hive/console/commit/ec356a7784d1f59722f80a69f501f1f250b2f6b2)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Collect custom scalars from arguments
  and input object fields

- Updated dependencies
  [[`ec356a7`](https://github.com/graphql-hive/console/commit/ec356a7784d1f59722f80a69f501f1f250b2f6b2)]:
  - @graphql-hive/core@0.8.4

## 0.33.12

### Patch Changes

- Updated dependencies
  [[`039c66b`](https://github.com/graphql-hive/console/commit/039c66bd24d4339e56b4e1e1fc7f8fa68de7e954)]:
  - @graphql-hive/core@0.8.3

## 0.33.11

### Patch Changes

- [#6057](https://github.com/graphql-hive/console/pull/6057)
  [`e4f8b0a`](https://github.com/graphql-hive/console/commit/e4f8b0a51d1158da966a719f321bc13e5af39ea0)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Explain what Hive is in README

## 0.33.10

### Patch Changes

- [#5676](https://github.com/graphql-hive/platform/pull/5676)
  [`c728803`](https://github.com/graphql-hive/platform/commit/c7288038f24c0214b4023994f306c6229c1ce72c)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Correct collection of enum values when
  used in a list

- Updated dependencies
  [[`c728803`](https://github.com/graphql-hive/platform/commit/c7288038f24c0214b4023994f306c6229c1ce72c)]:
  - @graphql-hive/core@0.8.2

## 0.33.9

### Patch Changes

- [#5667](https://github.com/kamilkisiela/graphql-hive/pull/5667)
  [`be5d39c`](https://github.com/kamilkisiela/graphql-hive/commit/be5d39cbf08d0681d142e83a708d300abc504c44)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Report enum values when an enum is used
  as an output type

- Updated dependencies
  [[`be5d39c`](https://github.com/kamilkisiela/graphql-hive/commit/be5d39cbf08d0681d142e83a708d300abc504c44)]:
  - @graphql-hive/core@0.8.1

## 0.33.8

### Patch Changes

- Updated dependencies
  [[`3ffdb6e`](https://github.com/kamilkisiela/graphql-hive/commit/3ffdb6e9466deb3c3aa09eea1445fc4caf698fd5)]:
  - @graphql-hive/core@0.8.0

## 0.33.7

### Patch Changes

- Updated dependencies
  [[`a896642`](https://github.com/kamilkisiela/graphql-hive/commit/a896642197e6d7779ba7ed71f365dfbd80532282)]:
  - @graphql-hive/core@0.7.1

## 0.33.6

### Patch Changes

- [#5361](https://github.com/kamilkisiela/graphql-hive/pull/5361)
  [`3f03e7b`](https://github.com/kamilkisiela/graphql-hive/commit/3f03e7b3a65707ba8aa04335684f0aa8d261868f)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Fixed issue where usage reports were
  sent only on app disposal or max batch size, now also sent at set intervals.
- Updated dependencies
  [[`3f03e7b`](https://github.com/kamilkisiela/graphql-hive/commit/3f03e7b3a65707ba8aa04335684f0aa8d261868f),
  [`0a3b24d`](https://github.com/kamilkisiela/graphql-hive/commit/0a3b24d400770c2cc84642959febb9288ad1c1b7)]:
  - @graphql-hive/core@0.7.0

## 0.33.5

### Patch Changes

- Updated dependencies
  [[`f2fef08`](https://github.com/kamilkisiela/graphql-hive/commit/f2fef08e9d1e13cb4a89d3882922db6dc822542e)]:
  - @graphql-hive/core@0.6.1

## 0.33.4

### Patch Changes

- Updated dependencies
  [[`e6dc5c9`](https://github.com/kamilkisiela/graphql-hive/commit/e6dc5c9df34c30c52555b27b0bca50e0be75480b)]:
  - @graphql-hive/core@0.6.0

## 0.33.3

### Patch Changes

- Updated dependencies
  [[`f1e43c6`](https://github.com/kamilkisiela/graphql-hive/commit/f1e43c641f3ebac931839c7dfbdcb3a885167562)]:
  - @graphql-hive/core@0.5.0

## 0.33.2

### Patch Changes

- Updated dependencies
  [[`b8998e7`](https://github.com/kamilkisiela/graphql-hive/commit/b8998e7ead84a2714d13678aaf1e349e648eb90a)]:
  - @graphql-hive/core@0.4.0

## 0.33.1

### Patch Changes

- [#4932](https://github.com/kamilkisiela/graphql-hive/pull/4932)
  [`cbc8364`](https://github.com/kamilkisiela/graphql-hive/commit/cbc836488b4acfb618fd877005ecf0126f1706b6)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Prevent failing usage reporting when returning an
  object with additional properties aside from `name` and `version` from the client info
  object/factory function.
- Updated dependencies
  [[`cbc8364`](https://github.com/kamilkisiela/graphql-hive/commit/cbc836488b4acfb618fd877005ecf0126f1706b6)]:
  - @graphql-hive/core@0.3.1

## 0.33.0

### Minor Changes

- [#4573](https://github.com/kamilkisiela/graphql-hive/pull/4573)
  [`06d465e`](https://github.com/kamilkisiela/graphql-hive/commit/06d465e882b569b6d0dbd5b271d2d98aafaec0b1)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - Break `@graphql-hive/client` into
  library-specific packages:

  - `@graphql-hive/core` - Core functionality
  - `@graphql-hive/apollo` - Apollo Client integration
  - `@graphql-hive/yoga` - Yoga Server integration
  - `@graphql-hive/envelop` - Envelop integration

  Migration steps are available in the README of each package.

- [#4494](https://github.com/kamilkisiela/graphql-hive/pull/4494)
  [`c5eeac5`](https://github.com/kamilkisiela/graphql-hive/commit/c5eeac5ccef9e2dcc3c8bb33deec0fb95af9552e)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - 🚨 BREAKING CHANGE 🚨 Requires now Node
  v16+

- [#4573](https://github.com/kamilkisiela/graphql-hive/pull/4573)
  [`06d465e`](https://github.com/kamilkisiela/graphql-hive/commit/06d465e882b569b6d0dbd5b271d2d98aafaec0b1)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - **Migration**

  Migration steps are available in the README.

  ```diff
  - import { useHive } from '@graphql-hive/client';
  + import { useHive } from '@graphql-hive/envelop';
  ```

### Patch Changes

- Updated dependencies
  [[`06d465e`](https://github.com/kamilkisiela/graphql-hive/commit/06d465e882b569b6d0dbd5b271d2d98aafaec0b1),
  [`c5eeac5`](https://github.com/kamilkisiela/graphql-hive/commit/c5eeac5ccef9e2dcc3c8bb33deec0fb95af9552e)]:
  - @graphql-hive/core@0.3.0
