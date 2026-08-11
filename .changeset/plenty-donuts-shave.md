---
'@graphql-hive/laboratory': patch
---

Laboratory: restore preflight behaviour that was lost when the lab moved into this package, and
stop a script from being able to wedge a run.

**Fixed**

- `lab.prompt()` works when a preflight script runs as part of an operation, not only from the
  **Test** button. Since the extraction the prompt handler was never wired up, so the script
  waited forever and the request was never sent. Two prompts arriving at once no longer strand
  the first, and dismissing the dialog answers the script with `null` instead of leaving it
  suspended.
- Preflight workers are terminated and their object URLs revoked on every exit, rather than
  leaking one per failed run.

**Restored** (shipped in #7620, dropped by #7697)

- `lab.prompt(title, defaultValue, { placeholder, description })`. **The first argument is now
  the field label rather than the input's placeholder** — the behaviour before the regression.
  Scripts written since then will render differently: pass `{ placeholder }` for the greyed-out
  hint. Descriptions render as plain text for now; markdown is a follow-up.
- A **Cancel** button on the prompt, which answers `null`.

**Added**

- Logs stream into the preflight pane while a script runs, from every run rather than only from
  **Test**, with a **Clear** button and the line and column each log or error came from.
- A **Stop** button, and running scripts are stopped when the lab unmounts.
- A 30 second execution limit, so a script that never finishes can't hold a request open. The
  clock is paused while a prompt is waiting on the user.
- `lab.environment.set()` accepts strings, numbers, booleans and `null`; anything else is
  dropped with a warning, since environment values are interpolated into headers as text.
- A note in the preflight editor that the script is stored as plain text, is readable by anyone
  who can open the lab, and that secrets belong in `lab.prompt()`.
