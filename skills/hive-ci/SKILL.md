---
name: hive-ci
description: >
  Set up GraphQL Hive schema checks and schema publishing in CI/CD pipelines, on GitHub Actions or
  any other CI system. Use this skill when: (1) adding Hive schema checks or publishing to a
  pipeline, (2) choosing a CI flow (simple, merge queue, deploy-gated, or a preview target per pull
  request), (3) configuring Hive access tokens, targets or a self-hosted registry in CI, (4) gating
  merges or deploys on Hive results, (5) fixing a failing Hive CLI step in CI.
license: MIT
compatibility: '@graphql-hive/cli 0.66.0 or later'
metadata:
  author: graphql-hive
  version: '1.0.0'
allowed-tools: Bash(hive:*) Bash(npx:*) Bash(git:*) Read Write Edit Glob Grep WebFetch
---

# Hive schema registry in CI

This skill sets up the Hive CLI in a CI/CD pipeline: schema checks on pull requests, and publishing
schemas when changes are merged or deployed. It works for any CI system. Provider-specific setup
lives in `references/`.

## Sources of truth

Hive's documentation changes. Fetch these pages instead of relying on memory, and never write a flag
that you have not confirmed in the CLI command reference.

| Need                                 | Source                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| CI/CD best practices (read first)    | https://the-guild.dev/graphql/hive/docs/other-integrations/ci-cd                                        |
| CLI commands and flags               | https://github.com/graphql-hive/console/blob/main/packages/libraries/cli/README.md#commands             |
| Error codes and exit codes           | https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors                                        |
| Schema registry concepts             | https://the-guild.dev/graphql/hive/docs/schema-registry                                                 |
| Creating an access token             | https://the-guild.dev/graphql/hive/docs/schema-registry/management/access-tokens#create-an-access-token |
| Public GraphQL API (preview targets) | https://the-guild.dev/graphql/hive/docs/api-reference/graphql-api                                       |
| Self-hosted Hive: CLI configuration  | https://the-guild.dev/graphql/hive/docs/schema-registry/self-hosting/client-and-cli-configuration       |

Most Hive docs pages are also available as markdown by appending `.md` to the URL, which is easier
to read. Without web access, use `hive <command> --help` and the `README.md` and `errors.json` files
in the installed `@graphql-hive/cli` package.

## Workflow

### 1. Discover the project (read only)

- **CI system**, from its files: `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`,
  `.circleci/config.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `.buildkite/`.
- **Schema source**: SDL files or globs, a build step that generates SDL (code-first), or a running
  service URL. The CLI command reference lists the supported inputs.
- **Project type**: single schema, Federation or schema stitching. Federation and stitching need
  `--service`, and publishing needs `--url`.
- **Delivery**: when services deploy (on merge, or in a separate deploy job), whether each pull
  request gets a preview environment, and whether the Git host uses a merge queue or merge train.
- **Registry**: Hive Cloud or self-hosted.

### 2. Read the CI/CD guide

Fetch https://the-guild.dev/graphql/hive/docs/other-integrations/ci-cd and follow its current best
practices. At the time of writing they are: pin the CLI version, use separate tokens with the
minimum permissions for each stage, use `--fail-on-composition-error` for distributed schemas, use
`--github` for GitHub check suites, and map branches to targets when there are several environments.
Where the guide and this skill disagree about a known CLI gap (see Ground rules), follow this skill.

### 3. Offer the flow options, then ask

Present these options with a recommendation based on step 1, and ask the user to choose before
writing any pipeline files.

| Flow                         | What runs                                                                                                    | Choose when                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **A. Simple** (default)      | Check when a pull request is opened or updated. Publish on merge to the default branch.                      | Services deploy on merge, and there is no merge queue.             |
| **B. Merge queue**           | A, plus a check in the merge queue with `--baseline` set to the queue's base commit.                         | The Git host batches pull requests in a merge queue.               |
| **C. Deploy-gated**          | Check on the pull request. `schema:push --revision` on merge. `schema:publish --revision` in the deploy job. | Deploys happen separately from merges (the guide's revision flow). |
| **D. Preview target per PR** | Check, then create a target for the PR, promote the base version into it, and publish the PR's schema to it. | Each pull request has a preview environment that reads its schema. |

Notes for the options:

- **B** needs the queue's base commit, a checkout that contains it (full history), and the pull
  request's identity so that approved breaking changes still count. Only GitHub Actions (the
  `merge_group` event) provides all three today. For other providers, the reference file says what
  is missing. Recommend A or C there.
- **C** stores the schema at merge time and publishes it only when the service is live. The deploy
  job publishes by revision and does not need the schema file.
- **D** runs the check first and creates nothing if it fails. The PR's target is deleted when the
  pull request is merged, and optionally when it is closed without merging. See
  `references/commands.md`.
- With several environments, follow the guide's branch-to-target mapping, for example `main` to
  `development`.

### 4. Token and target

- Create the token by following
  https://the-guild.dev/graphql/hive/docs/schema-registry/management/access-tokens#create-an-access-token.
  For CI, use a **project access token**. As a fallback, use an **organization access token scoped
  to the specific projects**.
- Grant only what each stage needs: `schemaCheck:create` to check, `schema:push` to push,
  `schemaVersion:publish` to publish, `schemaCheck:approve` for `--forceSafe`. Flow D also needs
  `target:create`, `target:delete` and `schemaVersion:promote`, granted on **all targets** of the
  project, because the PR's target does not exist when the token is created.
- These tokens need `--target <organization>/<project>/<target>` (or a target ID) on every command.
  Without it, the command fails with error `[102]`.
- Store the token in the CI system's secret store and expose it to the step as `HIVE_TOKEN`. Do not
  pass it on the command line.
- Self-hosted Hive: set `HIVE_REGISTRY` (or `--registry.endpoint`) to the registry's GraphQL
  endpoint.
- Run `hive whoami` with the token to confirm its permissions.

### 5. Commit, author and context

- With `--github` (GitHub Actions and the Hive GitHub integration), the integration provides the
  commit, the author and the pull request. Do not pass them.
- Everywhere else, pass `--commit` and `--author` explicitly on `schema:check` and `schema:publish`,
  using the provider's variables from its reference file. Where a provider has no author variable,
  use `git log -1 --format='%an <%ae>'` on the checked-out commit.
- For pull request checks without `--github`, pass `--contextId "<repository>#<PR number>"` so that
  breaking changes approved in Hive stay approved for later pushes to the same pull request.

### 6. Write the pipeline

Load the reference for the CI system, and the shared commands:

| CI system                                 | Reference                       |
| ----------------------------------------- | ------------------------------- |
| All providers (commands, API calls)       | `references/commands.md`        |
| GitHub Actions                            | `references/github-actions.md`  |
| GitLab CI/CD                              | `references/gitlab-ci.md`       |
| Azure Pipelines                           | `references/azure-pipelines.md` |
| CircleCI                                  | `references/circleci.md`        |
| Jenkins                                   | `references/jenkins.md`         |
| Bitbucket Pipelines, Buildkite, any other | `references/other-ci.md`        |

### 7. Verify

- Validate the pipeline file with the provider's linter or schema, if one exists.
- If a token is available locally, run the check command once with the same arguments.
- After the first CI run, confirm that each step fails the job when Hive reports a failure.

## Ground rules

- **ALWAYS** pin the CLI version, as the CI/CD guide describes.
- **ALWAYS** pass `--target`, and on composite projects `--service` (plus `--url` when publishing).
- **NEVER** use deprecated flags. Use `--registry.endpoint` or `HIVE_REGISTRY` instead of
  `--registry`, and `--registry.accessToken` or `HIVE_TOKEN` instead of `--token`. Remove `--force`
  and `--experimental_acceptBreakingChanges` from `schema:publish`; the CLI reports both as
  deprecated.
- **NEVER** set `HIVE_ENDPOINT` for the CLI. It has no effect, because the CLI reads
  `HIVE_REGISTRY`. Earlier versions of the CI/CD guide used `HIVE_ENDPOINT`.
- **NEVER** set `HIVE_REGISTRY` to an empty value, for example from an unset CI variable. The CLI
  then uses the empty value instead of the Hive Cloud default. Set it only for self-hosted Hive.
- **NEVER** run `schema:delete` without `--confirm` or `--dryRun` in CI. Without them it waits for
  interactive confirmation.
- **NEVER** print full schemas into CI logs. `schema:fetch` writes files with `--write`.
- **PREFER** `--experimentalJsonFile <path>` on `schema:check` when a later step needs the result as
  JSON.

## Exit codes and gating

The exit codes and every error code are documented at
https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors. Gate each step on a non-zero exit
code, with these gaps in CLI 0.66.0:

- `schema:publish` exits with 0 when it stores a Federation version that does not compose. Add
  `--fail-on-composition-error` so that the job fails instead.
- `schema:publish --github` exits with 0 when the publish is rejected; the result is only shown on
  the GitHub check-run. Leave out `--github` on a publish step whose result must fail the job, and
  pass `--commit` and `--author` instead.
- A timeout means the operation may still have completed. Check the result in Hive before retrying.

## Diagnose a failing step

1. Every error message ends with its code in brackets, for example `[124]`. Look up the cause and
   fix at https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors instead of guessing.
2. For permission errors, run `hive whoami` with the same token and target.
3. Check the flags against the CLI command reference. A flag that is not listed there does not
   exist.
