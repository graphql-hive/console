---
'@graphql-hive/cli': minor
---

Add experimental json file flag to command `schema:check`.

On the `schema:check` command, you can now use the flag `--experimental-json-file ./path/to/file.json` to output a JSON file containing the command's result.

This experimental feature is designed to help you with scripting, typically in CI/CD pipelines.

Please note that this is an experimental feature, and therefore is:

1. likely to change or be removed in a future version
2. not covered by semantic versioning.
