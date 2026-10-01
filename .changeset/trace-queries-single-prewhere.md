---
'hive': patch
---

Fix the trace list and trace filter options occasionally omitting recently ingested traces of a target after a filtered request. ClickHouse's query condition cache keyed the verdicts of these queries by their PREWHERE only while a separate WHERE dropped granules through skip indexes; the queries now carry every condition in a single PREWHERE.
