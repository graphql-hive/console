---
'hive': patch
---

Fix editor state and operation handling in Laboratory.

When opening a new tab or selecting a saved operation, the editor incorrectly populated the query, defaulting to the active query. This made it impossible to view the selected operation. Additionally, the submit button for saving an operation was always disabled, even when the form was in a valid state.
