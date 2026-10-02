---
'hive': major
---

**BREAKING CHANGE**: Before upgrading to this version, you must first upgrade to hive@12.1.0. Do not upgrade directly from an earlier version while the system is serving traffic.

To perform a rolling upgrade:
1. Upgrade all running services to `hive@12.1.0`.
2. Wait until all database migrations for `hive@12.1.0` have completed successfully.
3. Upgrade all services to this major version.

If downtime is acceptable, you can instead stop all traffic and running services, then upgrade directly to this version and run the migrations before bringing the system back online.
___

Backfill `graphs` table for existing `targets` and `contracts` to bring the database into a consistent state.
