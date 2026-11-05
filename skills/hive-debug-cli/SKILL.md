---
name: hive-debug-cli
description: Suggest why errors are occurring when using the hive-cli commands. Use when a hive-cli command (e.g. schema:check, schema:publish, hive) fails with an error code such as 103, 301, or other 1xx/2xx/3xx/6xx codes.
license: MIT
compatibility: '@graphql-hive/cli 0.66.0 or later'
metadata:
  author: Emily Goodwin
  version: '1.1.0'
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

### Step 3: Suggest a Corrected Command, if the Fix is Expressible as One

If the fix from step 2 is a change to the command line itself (a missing flag, a wrong flag count, a wrong flag value), show the user a corrected version of their *exact original command* with only that change applied — don't alter any other flag, argument, or value. Only use flag names that appear in the command the user ran or in the error code documentation fetched in step 2; never invent a flag name to make a correction look complete.

If the fix lives outside the command line (file contents, server-side permissions/scopes, environment setup), don't fabricate a corrected command — describe the fix in words instead.

## Example

Input:

```
$ hive schema:publish schema.graphql --service accounts --url http://localhost:4001/graphql
Error 103: A registry token is required to perform the action.
```

Output:

> Error 103 means no registry token was supplied for this command (per the [CLI error docs](https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors)). `schema:publish` requires authentication, and none of `HIVE_TOKEN`, `--registry.accessToken`, or a `hive.json` config entry were present.
>
> Set a token, then rerun. Either export `HIVE_TOKEN` and run the original command unchanged, or pass it directly:
>
> ```
> hive schema:publish schema.graphql --service accounts --url http://localhost:4001/graphql --registry.accessToken <your-token>
> ```

Note what the example does: cites the docs, states the cause in one sentence, and the corrected command changes only the one thing that was wrong — every other flag and argument from the original command is preserved as-is.

## Gotchas

- A corrected command is a suggestion, not an action: show it as text, never run it.
- Codes are bare numerals in brackets (e.g. `[103]`), never prefixed with `HIVE`. Don't add a prefix the CLI didn't print.
- 103 (missing token) vs 106 (invalid/expired/revoked token) vs 124 (access denied): 103 means no token was supplied at all, 106 means a token was supplied but is rejected outright, and 124 means the token is valid but lacks permission for the specific action/target. Check which case the command's flags/output actually show before picking one.
- 201 (no type definitions found) vs 301 (invalid SDL): 201 means the file has no parseable GraphQL definitions at all (empty or wrong format), while 301 means definitions exist but contain a syntax error at a specific line/column. Don't conflate "file is empty" with "file has a typo."
- 400 (malformed persisted documents) vs 401/700 (invalid operations): 400 is about the manifest file's structure not matching the expected format; 401/700 are about the GraphQL operations themselves failing to parse or violating the schema.
- 600 (service/URL count mismatch) vs 601-603 (composition failures): 600 fires before composition even runs, when the number of `--service` and `--url` flags don't match. 601-603 assume the counts matched and the composition step itself failed (locally, remotely, or produced invalid output).