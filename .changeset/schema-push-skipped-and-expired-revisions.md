---
'hive': minor
---

Fix how schema push and publishing a revision handle repeated pushes, service names, concurrent
pushes and expired revisions.

- Pushing a revision that already exists with the same schema succeeds and extends the revision's
  expiry, so an unpublished revision stays available for 30 days after its most recent push. A
  revision that has been published never expires.
- Concurrent pushes of the same revision no longer fail with an unexpected error.
- A publish whose revision expires and is removed while it is being published now reports that
  the revision was not found, instead of an unexpected error.
- Schema push now rejects invalid service names instead of accepting them and failing when the
  revision is published. Unlike schema check and publish, this also applies to existing services
  whose names are no longer valid, so that services can be migrated to the new name format.
- Schema push now ignores the service name for single-schema projects, like schema publish does.
- Publishing a schema revision without a service name in a Federation or schema stitching project now
  reports the missing service name, instead of reporting that the revision was not found.
