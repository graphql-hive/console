---
'hive': minor
---

Bump recommended clickhouse version for self-hosting to `26.3.12.3`. Pass
`output_format_json_quote_64bit_integers=1` search parameter to clickhouse database queries
expecting `JSON` responses to ensure consistent response output for different cloud providers.
