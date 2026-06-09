#!/bin/bash

pnpm sentry-cli releases new $SENTRY_RELEASE

# Debug ids are injected earlier (scripts/sourcemaps-inject.sh, before the Docker
# bake) so the deployed bundle carries them. Here we only upload the maps.
for dir in packages/services/*/dist; do
  name=$(echo $dir | awk -F / '{print $3}')
  echo $name

  if [[ $name == *-worker ]]; then
    pnpm sentry-cli sourcemaps upload --release=$SENTRY_RELEASE $dir --dist $name
  else
    pnpm sentry-cli sourcemaps upload --release=$SENTRY_RELEASE $dir --dist $name --url-prefix /usr/src/app/\@hive/$name
  fi
done

# Client sourcemaps handled by @sentry/vite-plugin during build

# Server sourcemaps (dist: app, matching backend.ts SDK init)
pnpm sentry-cli sourcemaps upload --release=$SENTRY_RELEASE packages/web/app/dist --dist app --url-prefix /usr/src/app/\@hive/app --ignore client

pnpm sentry-cli releases finalize "$SENTRY_RELEASE"
