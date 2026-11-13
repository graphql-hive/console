---
'@graphql-hive/cli': patch
---

`operations:check` no longer fails on an operation or fragment whose string literal contains `...`.
Fragment spreads were found with a regular expression over the printed document, which mistook the
sequence inside a string for a spread; they are now read from the parsed document.
