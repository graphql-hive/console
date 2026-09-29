# Hive CLI commands for every CI system

The provider references map their own variables onto the environment variables below, so the
commands are the same everywhere. Confirm every flag in the CLI command reference before using it:
https://github.com/graphql-hive/console/blob/main/packages/libraries/cli/README.md#commands

## Environment variables used in these commands

| Variable            | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `HIVE_TOKEN`        | Access token, from the CI system's secret store. The CLI reads it automatically.              |
| `HIVE_REGISTRY`     | Self-hosted Hive only: the registry's GraphQL endpoint. The CLI reads it automatically.       |
| `HIVE_ORGANIZATION` | Organization slug.                                                                            |
| `HIVE_PROJECT`      | Project slug.                                                                                 |
| `HIVE_TARGET`       | Target slug that pull requests are checked against and merges publish to, e.g. `development`. |
| `SCHEMA_PATH`       | Schema file, glob or URL, as supported by the CLI.                                            |
| `SERVICE_NAME`      | Federation and stitching only: the service (subgraph) name.                                   |
| `SERVICE_URL`       | Federation and stitching only: the service URL, for publishing.                               |
| `COMMIT`, `AUTHOR`  | Commit SHA and author. Set from the provider's variables. Not needed with `--github`.         |
| `CONTEXT_ID`        | `<repository>#<pull request number>` on pull request checks. Not needed with `--github`.      |
| `PR_NUMBER`         | Pull request number, for flow D.                                                              |

Leave out `--service` and `--url` on single-schema projects. `--fail-on-composition-error` applies
to Federation projects.

## Install a pinned CLI

Follow the installation section of the CI/CD guide and the CLI reference, and pin the version:

- Node.js projects: add `@graphql-hive/cli` at a fixed version to `devDependencies`, and run it with
  the project's package manager (`npx hive ...`, `pnpm hive ...`, `yarn hive ...`).
- Other projects: `curl -sSL https://graphql-hive.com/install.sh | sh -s "<version>"`.
- Container jobs: the image `ghcr.io/graphql-hive/cli:<version>`. Its entrypoint is `hive` and it
  includes git, but not curl. CI systems that run a shell script inside the image must override the
  entrypoint.

The install script installs into `/usr/local` and runs `sudo` when it is not running as root, so the
job needs root or passwordless sudo. GitHub-hosted runners, Microsoft-hosted agents and CircleCI's
`cimg` images have passwordless sudo, and GitLab and Bitbucket Pipelines jobs usually run as root in
their container. Self-hosted agents, such as many Jenkins and Buildkite agents, often have neither.
There, run the Hive steps in the CLI image instead.

## Check a pull request

Without the GitHub integration:

```sh
hive schema:check "$SCHEMA_PATH" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --service "$SERVICE_NAME" \
  --commit "$COMMIT" \
  --author "$AUTHOR" \
  --contextId "$CONTEXT_ID"
```

With the Hive GitHub integration on GitHub Actions, replace `--commit`, `--author` and `--contextId`
with `--github`.

## Publish on merge (flow A)

```sh
hive schema:publish "$SCHEMA_PATH" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --service "$SERVICE_NAME" \
  --url "$SERVICE_URL" \
  --commit "$COMMIT" \
  --author "$AUTHOR" \
  --fail-on-composition-error
```

Do not add `--github` here: with CLI 0.66.0 a rejected publish then still exits with 0.

## Check in a merge queue (flow B)

```sh
hive schema:check "$SCHEMA_PATH" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --service "$SERVICE_NAME" \
  --baseline "$BASE_COMMIT:$SCHEMA_PATH" \
  --github
```

`BASE_COMMIT` is the commit the queue entry is built on, and the checkout must contain it (fetch the
full history). Only GitHub Actions provides it together with the pull request identity; see
`github-actions.md`.

## Push, then publish at deploy time (flow C)

On merge, store the schema under the commit SHA:

```sh
hive schema:push "$SCHEMA_PATH" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --service "$SERVICE_NAME" \
  --revision "$COMMIT"
```

In the deploy job, after the service is live, publish the same revision. The schema file is not
needed, but `--commit` and `--author` are:

```sh
hive schema:publish \
  --revision "$COMMIT" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --service "$SERVICE_NAME" \
  --url "$SERVICE_URL" \
  --commit "$COMMIT" \
  --author "$AUTHOR" \
  --fail-on-composition-error
```

Pushed revisions expire if they are not published in time, and a revision name cannot be reused with
a different schema.

## Preview target per pull request (flow D)

Each pull request gets its own target, `pr-<number>`. Target slugs are at most 50 characters of
lowercase letters, digits and dashes, so build the slug from the pull request number, never from the
branch name. The token needs `target:create`, and on all targets of the project `target:delete`,
`schemaVersion:promote`, `schemaCheck:create` and `schemaVersion:publish`.

Creating and deleting targets uses the public GraphQL API
(https://the-guild.dev/graphql/hive/docs/api-reference/graphql-api). These helpers need `curl` and a
POSIX shell:

```sh
PREVIEW_TARGET="pr-$PR_NUMBER"
# Hive Cloud's API endpoint. Self-hosted Hive serves the API at its registry endpoint.
HIVE_API="${HIVE_REGISTRY:-https://api.graphql-hive.com/graphql}"

hive_api() {
  curl -sS "$HIVE_API" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $HIVE_TOKEN" \
    --data "$1"
}

preview_target_exists() {
  hive_api "$(printf '{"query":"query HiveCiPreviewTarget($target: TargetReferenceInput!) { target(reference: $target) { id } }","variables":{"target":{"bySelector":{"organizationSlug":"%s","projectSlug":"%s","targetSlug":"%s"}}}}' \
    "$HIVE_ORGANIZATION" "$HIVE_PROJECT" "$PREVIEW_TARGET")" | grep -q '"id"'
}

create_preview_target() {
  response=$(hive_api "$(printf '{"query":"mutation HiveCiCreatePreviewTarget($input: CreateTargetInput!) { createTarget(input: $input) { ok { createdTarget { id } } error { message } } }","variables":{"input":{"project":{"bySelector":{"organizationSlug":"%s","projectSlug":"%s"}},"slug":"%s"}}}' \
    "$HIVE_ORGANIZATION" "$HIVE_PROJECT" "$PREVIEW_TARGET")")
  echo "$response" | grep -q '"createdTarget"' || {
    echo "Could not create target $PREVIEW_TARGET: $response" >&2
    return 1
  }
}

delete_preview_target() {
  response=$(hive_api "$(printf '{"query":"mutation HiveCiDeletePreviewTarget($input: DeleteTargetInput!) { deleteTarget(input: $input) { ok { deletedTargetId } error { message } } }","variables":{"input":{"target":{"bySelector":{"organizationSlug":"%s","projectSlug":"%s","targetSlug":"%s"}}}}}' \
    "$HIVE_ORGANIZATION" "$HIVE_PROJECT" "$PREVIEW_TARGET")")
  echo "$response" | grep -q '"deletedTargetId"' || {
    echo "Could not delete target $PREVIEW_TARGET: $response" >&2
    return 1
  }
}
```

On every push to the pull request, run the check first. It fails the job before anything is created
if the schema is invalid:

```sh
set -e
# 1. Check against the base target (the "Check a pull request" command above).
# 2. Create the pull request's target if it does not exist yet.
preview_target_exists || create_preview_target
# 3. Promote the base target's latest version into it.
hive schema:promote \
  --from "$HIVE_ORGANIZATION/$HIVE_PROJECT/$HIVE_TARGET" \
  --to "$HIVE_ORGANIZATION/$HIVE_PROJECT/$PREVIEW_TARGET"
# 4. Publish the pull request's schema to it.
hive schema:publish "$SCHEMA_PATH" \
  --target "$HIVE_ORGANIZATION/$HIVE_PROJECT/$PREVIEW_TARGET" \
  --service "$SERVICE_NAME" \
  --url "$SERVICE_URL" \
  --commit "$COMMIT" \
  --author "$AUTHOR" \
  --fail-on-composition-error
```

Promoting on every push keeps the preview in step with the base target. `schema:promote` fails if
the base target has no schema version yet.

When the pull request is merged, delete its target. Running the same cleanup when a pull request is
closed without merging stops abandoned pull requests from leaving targets behind:

```sh
if preview_target_exists; then delete_preview_target; fi
```

Run the preview job and the cleanup job one at a time for each pull request (for example with a
concurrency group), so a late preview job cannot recreate a deleted target.

If the preview environment reads its schema from the Hive CDN, it also needs the target's CDN
endpoint and a CDN access token (see
https://the-guild.dev/graphql/hive/docs/schema-registry/high-availability-cdn). Creating one needs
`cdnAccessToken:modify` on all targets. This helper writes both to the file given as its argument,
as `HIVE_CDN_ENDPOINT` and `HIVE_CDN_ACCESS_TOKEN` (the names `hive artifact:fetch` reads), and
never prints the secret:

```sh
create_preview_cdn_token() {
  response=$(hive_api "$(printf '{"query":"mutation HiveCiCreatePreviewCdnToken($input: CreateCdnAccessTokenInput!) { createCdnAccessToken(input: $input) { ok { secretAccessToken cdnUrl } error { message } } }","variables":{"input":{"target":{"bySelector":{"organizationSlug":"%s","projectSlug":"%s","targetSlug":"%s"}},"alias":"CI preview %s"}}}' \
    "$HIVE_ORGANIZATION" "$HIVE_PROJECT" "$PREVIEW_TARGET" "$PREVIEW_TARGET")")
  secret=$(echo "$response" | sed -n 's/.*"secretAccessToken":"\([^"]*\)".*/\1/p')
  cdn_url=$(echo "$response" | sed -n 's/.*"cdnUrl":"\([^"]*\)".*/\1/p')
  if [ -z "$secret" ] || [ -z "$cdn_url" ]; then
    echo "Could not create a CDN access token for $PREVIEW_TARGET: $(echo "$response" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p')" >&2
    return 1
  fi
  printf 'HIVE_CDN_ENDPOINT=%s\nHIVE_CDN_ACCESS_TOKEN=%s\n' "$cdn_url" "$secret" > "$1"
}
```

Each call creates a new token, and deleting the target deletes its tokens. Hand the file to the
preview deployment through the CI system's secret mechanism: a file saved as a job artifact can be
read by anyone who can download the job's artifacts.
