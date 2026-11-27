---
'hive': patch
---

Schema checks now report adding an argument with a default value to an existing directive as a
dangerous change. Existing usages of the directive keep working, but they now receive the default
value, which may change runtime behaviour.

- Adding a non-null argument with a default value, for example `@cache(maxAge: Int! = 60)`, was
  reported as a breaking change and failed the check. It no longer fails the check, unless the
  target is configured to fail on dangerous changes.
- Adding a nullable argument with a default value, for example `@cache(scope: String = "PUBLIC")`,
  was reported as a safe change. It now fails the check when the target is configured to fail on
  all dangerous changes or on `DIRECTIVE_ARGUMENT_ADDED`.

Adding an argument without a default value is reported as before: breaking when it is non-null,
safe when it is nullable. Adding arguments to a directive that is new in the same change stays
safe.
