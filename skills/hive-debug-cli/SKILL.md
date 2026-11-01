---
name: hive-debug-cli
description: Suggest why errors are occurring when using the hive-cli commands. Use when a hive-cli command (e.g. schema:check, schema:publish, hive) fails with an error code such as 103, 301, or other 1xx/2xx/3xx/6xx codes.
license: MIT
compatibility: '@graphql-hive/cli 0.66.0 or later'
metadata:
  author: Emily Goodwin
  version: '1.0.0'
allowed-tools: WebFetch
---

# Hive Debug CLI

## Instructions

### Step 1: Analyze the CLI Command and Error Code

Using the terminal output, identify the command that triggered the error, the parameters passed to it, and the error code it produced. This information will be used in step 2.

If the terminal output doesn't include a command or an error code, do not guess. Ask the user for the exact command they ran and the full error output before proceeding.

### Step 2: Explain the Error Code and Why it was Triggered

Using the information gained in step 1, use [this link](https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors) to determine the reason for the error code. Based on this information, determine the suggested cli command and reason for the error code.

Verify your results against the error code documentation and ensure it makes sense given the parameters passed in and the error code. If you don't know, tell the user you don't know. If the WebFetch fails, share the URL with the user.

## Gotchas

- Codes are bare numerals in brackets (e.g. `[103]`), never prefixed with `HIVE`. Don't add a prefix the CLI didn't print.
- 103 (missing token) vs 106 (invalid/expired/revoked token) vs 124 (access denied): 103 means no token was supplied at all, 106 means a token was supplied but is rejected outright, and 124 means the token is valid but lacks permission for the specific action/target. Check which case the command's flags/output actually show before picking one.
- 201 (no type definitions found) vs 301 (invalid SDL): 201 means the file has no parseable GraphQL definitions at all (empty or wrong format), while 301 means definitions exist but contain a syntax error at a specific line/column. Don't conflate "file is empty" with "file has a typo."
- 400 (malformed persisted documents) vs 401/700 (invalid operations): 400 is about the manifest file's structure not matching the expected format; 401/700 are about the GraphQL operations themselves failing to parse or violating the schema.
- 600 (service/URL count mismatch) vs 601-603 (composition failures): 600 fires before composition even runs, when the number of `--service` and `--url` flags don't match. 601-603 assume the counts matched and the composition step itself failed (locally, remotely, or produced invalid output).