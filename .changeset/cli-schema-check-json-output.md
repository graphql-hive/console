---
'@graphql-hive/cli': minor
---

Add an `--output=json` flag to `hive schema:check`. With it, only a JSON document is written to
stdout, containing `valid`, the `schemaCheck` `id` and `webUrl`, and the `changes`, `warnings` and
`errors` of the check, while all other messages go to stderr. This makes it easy to read the check
ID in scripts, e.g. `hive schema:check schema.graphql --output=json | jq -r .schemaCheck.id`.
