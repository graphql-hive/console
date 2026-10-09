---
'@graphql-hive/laboratory': patch
---

Icon-only controls now have accessible names: the left rail (Collections, History, Documentation,
Settings), the collections pane (add, search clear, edit, save and cancel rename, delete collection,
delete operation) and the tab close control, which is now a real button. Tabs expose
`data-state="active" | "inactive"`, and preflight log lines carry `data-level` inside a
`role="log"` list. The Settings rail button no longer toggles the history panel when clicked.
