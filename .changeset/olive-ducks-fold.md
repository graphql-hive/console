---
'@graphql-hive/cli': minor
---

Add JSON output mode.

All commands now have a `--json` flag that will enable JSON output as opposed to plain text.

### Viewing the Schema

If you want to know what the schema is for a particular command's JSON output there are two things you can do:

1. All commands have a `--show-output-schema-json` flag that will show the JSON output schema.
2. Help output now includes a `JSON Output Schema` section that shows the JSON schema for the command.

The schema is expressed using JSON Schema.

### Caveats

- The `dev` command is not yet supported.
- Common command output cases have been updated to support JSON output, but coverage is not 100% complete, in particular failure cases.
- There is no official documentation for the schema. For now, just try it out to see what outputs you get, or review to the source code. Its accessible: each command has its own module that contains its declaratively defined output schema (using Typebox).

Remember that the Hive CLI is pre-1.0.0 and every minor release could bring breaking changes. Going forward we will mention in the changelog any time the schema has breaking changes.
