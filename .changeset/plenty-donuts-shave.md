---
'@graphql-hive/laboratory': patch
---

Laboratory: restore preflight behaviour that was lost when the lab moved into this package, and
stop a script from being able to wedge a run.

- `lab.prompt(title, defaultValue, { placeholder, description })`. **The first argument is now
  the field label rather than the input's placeholder**.
- `lab.environment.set()` accepts strings, numbers, booleans and `null`; anything else is
  dropped with a warning, since environment values are interpolated into headers as text.
- New `preflightNotice` prop. The preflight editor warns that scripts run in the reader's
  browser; hosts that share one script between people should say so here.