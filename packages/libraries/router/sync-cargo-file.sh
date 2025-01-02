#/bin/bash

# The following script syncs the "version" field in package.json to the "package.version" field in Cargo.toml
# This main versioning flow is managed by Changeset.
# This file is executed during "changeset version" (when the version is bumped and release PR is created)
# to sync the version in Cargo.toml

# References:
# .github/workflows/publish-rust.yaml - The GitHub action that runs this script (after "changeset version")
# .github/workflows/main-rust.yaml - The GitHub action that does the actual publishing, if a changeset is declared to this package/crate

npm_version=$(node -p "require('./package.json').version")
cargo install set-cargo-version
set-cargo-version ./Cargo.toml $npm_version
