---
'hive': patch
---

Retry the GitHub check-run update for a few seconds when GitHub answers 404 right after creating the check-run, so a schema check or publish no longer fails on GitHub's read-after-write lag.
