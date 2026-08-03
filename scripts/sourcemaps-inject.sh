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
