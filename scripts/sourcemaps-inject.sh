#!/bin/bash
set -euo pipefail

# Inject Sentry debug ids into the built service bundles.
#
# This MUST run before the Docker image is baked (see the "inject sentry debug
# ids" step in .github/workflows/build-and-dockerize.yaml). The bake copies the
# host `dist/` into the image, so the debug ids have to already be in those
# files; otherwise the deployed bundle has no debug id and Sentry can't match it
# to the uploaded source maps -> minified stack traces. Uploading the maps
# happens later, in sourcemaps-upload.sh, after the bake.
#
# web/app is intentionally excluded: its client + SSR bundles get debug ids from
# @sentry/vite-plugin during the build. Only the runify/esbuild-built services
# need CLI injection.
for dir in packages/services/*/dist; do
  pnpm sentry-cli sourcemaps inject "$dir"
done

# Smoke alarm: confirm injection actually wrote a debug id into each service
# entrypoint, and fail the build loudly if not. Without this, a broken inject
# (e.g. a sentry-cli upgrade or missing .map files) would silently ship
# un-instrumented bundles and we'd only notice via minified stack traces in
# Sentry weeks later.
# NOTE: this proves inject ran on the host dist; it does NOT prove the Docker
# image bakes these files (that ordering is enforced structurally by running
# this script before the bake in build-and-dockerize.yaml).
for f in packages/services/*/dist/index.js; do
  grep -q "sentryDebugIds" "$f" || {
    echo "::error::no debug id injected in $f"
    exit 1
  }
done
