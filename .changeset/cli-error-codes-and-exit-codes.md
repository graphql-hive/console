---
'@graphql-hive/cli': major
---

Report every CLI failure with an accurate, unique and documented error code, and report schema check
and schema publish results accurately when using `--github`.

**Breaking changes**

- `hive schema:check --github` now exits with code 1 when the schema check fails. Previously it
  exited with 0 whenever the GitHub check-run was created. The failure is reported as error `[202]`,
  and `--forceSafe` now approves failed checks in GitHub mode as well.
- A failed schema check now prints `Schema check failed. [202]` to stderr. The exit code is unchanged.
- `hive schema:check --forceSafe` now exits with code 1 (error `[203]`) when the registry did not
  store a schema check that could be approved, instead of exiting with 0.
- `hive schema:publish --github` now exits with code 1 (error `[300]`) when the publish is rejected,
  for example by `--fail-on-composition-error`, and prints the reason for errors that happen before
  a GitHub check-run is created.
- Exit codes are now consistent: `1` means the operation failed, `2` means a request timed out, and
  `3` means invalid input or setup. Invalid arguments and flags, and unknown commands, now exit with
  `3` instead of `2`. A missing CDN endpoint now exits with `3` instead of `1`.
- Error codes are now unique: `InvalidVersionIdError` is now `[122]` and `ConflictingOptionsError`
  is now `[123]` (both were `[121]`).
- An invalid `hive.json`, a file set with `HIVE_CONFIG` that does not exist, or an unknown
  `HIVE_SPACE` now fails with error `[100]`. Previously the configuration was silently ignored, so
  the CLI fell back to the default registry endpoint or reported a missing access token. The legacy
  `{ "registry": "...", "token": "..." }` format is read correctly again.
- Passing both a schema file and `--revision` to `hive schema:publish` now fails with error `[123]`
  instead of ignoring the file.
- `--github` for `schema:check` and `schema:publish`, and `hive schema:push`, need a Hive server that
  includes the new `GitHubSchemaCheckSuccess`, `GitHubSchemaPublishSuccess` and `SchemaPushOk` fields.
  Older servers are reported with error `[125]`.

**New error codes**

- `[124]` Access denied: the access token is missing the named permission, or the target does not
  exist or is not accessible to the token. Previously reported as `[115]`.
- `[125]` Unsupported Hive server version: the server does not know a field the CLI sends.
- `[126]` A request to the Hive registry or CDN timed out. The operation may still have completed
  on the server, so check the result before retrying. Other network errors, including timeouts while
  introspecting a GraphQL service, remain `[114]`.
- `[127]` Invalid command input, `[128]` invalid header.
- `[202]` Schema check failed, `[203]` schema check approval failed.

Other errors that were previously reported as unexpected (`[199]`) or without a code now use the
matching code, for example a missing or empty schema file (`[200]`, `[201]`), invalid SDL in
`schema:check` (`[301]`), an invalid CDN access token (`[107]`), HTTP error responses (`[113]`) and
`--forceSafe` without a target slug (`[102]`).
`hive introspect` reports a missing, empty or invalid schema file as `[200]`, `[201]` or `[301]`, and
keeps `[116]` for GraphQL services that cannot be introspected.
Invalid registry access tokens that expired are reported as `[106]`.

**New features**

- `hive schema:push` reports when a revision with the same schema already exists and skips it, shows
  when a pushed revision expires, and warns when `--service` is ignored for a single-schema project.
- `hive app:create` shows why the app name or version was rejected.
- Error messages link to the documentation of their error code, and the CLI README lists every error
  code with its exit code and recommended fix. The list is also published as `errors.json` in the
  package.
