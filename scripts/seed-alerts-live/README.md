# Live alerts demo

A long-running script that lets you **watch metric alert rules fire and recover in real time**
against the running workflows evaluator. Useful for developing the alerts UI and sanity-checking the
end-to-end notification path.

## What this is (and isn't)

This is a **test harness for the existing alert infrastructure**, not a parallel implementation of
any of it. The workflows-service evaluator (the cron that runs every minute, queries ClickHouse,
drives the state machine, dispatches notifications) is the subject of the demo. The script is just
the thing that _feeds_ it.

After a brief setup phase (org / project / target / rules — all created via the same GraphQL
mutations the UI uses), the **only ongoing thing this script does is push usage data**. Every 5
seconds it POSTs a `Report` to the local usage service via the canonical `collect` path —
byte-for-byte the same wire format a real Hive client uses in production.

That's it. Everything else (state transitions, notifications, the auto-updating UI) comes from the
existing system reacting to that data:

- ClickHouse aggregates the operations into `operations_minutely` (materialized view).
- The workflows evaluator's cron reads each minute's window, compares against rule thresholds, and
  writes state-machine transitions to Postgres.
- The notification fan-out dispatches webhooks to the channels attached to each rule.
- The alerts pages in the web app poll every 15s and re-render as Postgres state changes.

The script also runs a tiny webhook receiver on port 9999 (the URL the demo's webhook channel points
at) and pretty-prints every incoming payload so you can see the notification bodies the workflows
service is dispatching.

## What it does at startup (one-shot)

1. Preflight checks (port 9999 free, API and usage services reachable).
2. Prompts for an owner email. Press Enter to auto-generate a fresh
   `live-alerts-demo-{ts}@localhost.localhost` user, or paste an existing dev account email to reuse
   it (handy if you already have a browser tab signed in as that user).
3. Starts the webhook receiver on port 9999.
4. Creates a dedicated `live-alerts-demo-{timestamp}` org / project / target via GraphQL mutations.
5. Enables the per-org `metricAlertRules` feature flag (direct PG `UPDATE`, since the cluster env
   var is usually off in local dev).
6. Publishes a tiny schema (so the usage service will accept operations against the target).
7. Creates one webhook channel pointing at port 9999, and (unless started with `--no-rules`) 7
   short-window alert rules each `timeWindowMinutes: 1`.
8. Pre-seeds ~60s of backdated breach-shaped data so the first evaluator tick after rule creation
   already sees a fully-formed breach window in `operations_minutely`. Cuts time-to-first-FIRING
   from ~2-3 min to ~2 min.

## What it does continuously (the loop)

Alternates 3-minute BREACH and NORMAL phases:

- **BREACH**: pushes one `Report` every 5 seconds (~20 ops with 50% errors, p95≈2000ms). Above the
  thresholds of rules 1, 2, 3, 5, 6, 7. Above rule 4's BELOW-direction floor, so rule 4 recovers.
- **NORMAL**: pushes **nothing**. Silence is the breach for rule 4: with zero traffic, the
  evaluator's zero-window-synthesis path resolves TRAFFIC=0, below rule 4's `< 10/min` floor, so
  rule 4 fires. Rules 1, 2, 3, 5, 6, 7 recover during NORMAL because their thresholds resolve to 0
  (or, for rule 2, the PERCENTAGE_CHANGE settles).

The workflows evaluator picks up each minute's data on its 60s cron and drives the state machine;
the alerts pages refresh their queries every 15s so transitions are visible in the UI without manual
refresh.

## The 7 rules

The rule mix is intentionally varied so the demo exercises the feature surface:

| #   | Type        | Direction | Threshold type            | Confirmation | Severity | What it demos                                                                                                                              |
| --- | ----------- | --------- | ------------------------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | TRAFFIC     | ABOVE     | FIXED_VALUE (50)          | 0 min        | INFO     | Baseline path; fastest state cycle                                                                                                         |
| 2   | ERROR_RATE  | ABOVE     | PERCENTAGE_CHANGE (+200%) | 0 min        | WARNING  | PERCENTAGE_CHANGE thresholding. Fires transiently on the first BREACH then settles to 0% as the prior window itself becomes "high errors". |
| 3   | LATENCY P95 | ABOVE     | FIXED_VALUE (1500ms)      | 1 min        | CRITICAL | Non-zero confirmation period: rule sits in PENDING for 1 evaluator tick before reaching FIRING.                                            |
| 4   | TRAFFIC     | BELOW     | FIXED_VALUE (10)          | 0 min        | WARNING  | BELOW direction. Fires during NORMAL phases (silence) and recovers during BREACH. Exercises the zero-window-synthesis fix.                 |
| 5   | ERROR_RATE  | ABOVE     | FIXED_VALUE (25%)         | 0 min        | CRITICAL | Absolute error-rate threshold (the steady-state firing counterpart to rule 2).                                                             |
| 6   | LATENCY AVG | ABOVE     | FIXED_VALUE (800ms)       | 0 min        | WARNING  | Avg-latency variant; fires alongside P95 during BREACH.                                                                                    |
| 7   | TRAFFIC     | ABOVE     | FIXED_VALUE (100)         | 0 min        | WARNING  | Higher traffic threshold so two different INFO/WARNING severities fire concurrently.                                                       |

## Prerequisites

- Hive dev running locally. Ensure that clickhouse is up and running.
- The workflows service's `.env` must have `CLICKHOUSE=1` + the host/port/user/password/protocol
  values populated. This repo's
  [`packages/services/workflows/.env.template`](../../packages/services/workflows/.env.template)
  ships with these entries set up for the local Compose stack; if your local `.env` is older, copy
  them across. Without `CLICKHOUSE=1`, the env zod schema picks the disabled variant of the
  discriminated union and `env.clickhouse` resolves to `null`, which makes the evaluator cron return
  at the first line every minute.

## Run

```sh
pnpm seed:alerts-live
```

Stop with Ctrl+C. The org is left in place so you can inspect artifacts (state-log rows, incident
history, etc.) after the script exits.

To also watch the `Metric Alerts` Grafana dashboard fill in (live metrics — CH query latency / rate
/ error ratio / task duration — plus the trace tables under "Traces (drill-downs)"), run
`pnpm dev:observability` in another terminal and open <http://localhost:3030>. See
[docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md#local-grafana--prometheus-optional) for details on
the local observability stack.

### Data-driver-only mode (`--no-rules`)

```sh
pnpm seed:alerts-live --no-rules
```

Skips the 7 pre-created rules. The script still provisions the org / project / target / webhook
channel and runs the BREACH/NORMAL traffic loop, so the workflows evaluator has data to chew on as
soon as a rule exists. Use this when you want to create rules manually via the UI from a clean state
(e.g. for video walkthroughs).

The summary block prints a URL pointing at `/alerts/create` instead of `/alerts/rules`. Create a
rule whose thresholds match the traffic the loop generates so a fire is guaranteed:

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| BREACH traffic | 240 req/min · 50% errors · p95 ≈ 2000ms · avg ≈ 1000ms |
| NORMAL traffic | 0 req/min (silence)                                    |

For example, mirroring the seeded rule 3: LATENCY P95 ABOVE FIXED_VALUE 1500ms, 1-min confirmation,
CRITICAL — fires within ~2 minutes after creation, recovers within ~2 minutes after the script
switches to its NORMAL phase.

## Expected timing

| When                        | What you should see                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Within ~3 seconds           | Script logs the org slug + dashboard URL and begins its first BREACH phase (with ~60s of backdated breach data already in ClickHouse).              |
| Within ~1–2 minutes         | Rules 1, 5, 6, 7 enter PENDING then FIRING. Rule 2 fires transiently then settles back to NORMAL. Rule 3 enters PENDING.                            |
| Within ~2–3 minutes         | Rule 3 reaches FIRING (1-min confirmation elapsed). Script switches to NORMAL phase.                                                                |
| Within ~4–5 minutes         | Rules 1, 3, 5, 6, 7 recover (RECOVERING → NORMAL). Rule 4 enters PENDING then FIRING (zero traffic during NORMAL falls below its `< 10/min` floor). |
| Within ~6 minutes           | Script switches back to BREACH. Rule 4 recovers; rules 1, 5, 6, 7 fire again. Rule 2 fires transiently again.                                       |
| Every ~6 minutes thereafter | The cycle repeats.                                                                                                                                  |

Webhook payloads from FIRING / RESOLVED notifications print in the script terminal as the workflows
service dispatches them.

## Cleanup

After running the script repeatedly during a debugging session, you'll have several
`live-alerts-demo-*` orgs accumulated in your local DB. Each one's rules keep getting evaluated by
the workflows cron every minute, and notification dispatch tries to POST to the now-dead
`localhost:9999` (the webhook receiver dies with the script), which fills your `pnpm dev:hive`
terminal with ECONNREFUSED retry failures. Drop them with:

```sh
pnpm seed:alerts-live:cleanup
```

This deletes every `live-alerts-demo-*` org; FK cascades handle the rest.

## Troubleshooting

**Preflight fails: "Port 9999 is in use"** Another instance of `seed-alerts-live` is probably still
running. Kill it (or any other process listening on 9999) and re-run.

**Preflight fails: "API server unreachable" / "Usage service unreachable"** You haven't started
`pnpm dev:hive`, or one of those services failed to come up. Check the `pnpm dev:hive` terminal
output for errors.

**No state transitions happen after several minutes**

First, sanity-check the workflows service's `workflows:dev` terminal. There are three patterns:

1. _Only `Completed task ... evaluateMetricAlertRules` lines, each finishing in well under 5ms, and
   no `Evaluating metric alert rules count=N` / `Metric alert evaluation complete ...` lines in
   between._ The evaluator is silently bailing because ClickHouse isn't configured for the workflows
   service. Open [`packages/services/workflows/.env`](../../packages/services/workflows/.env) and
   confirm it has `CLICKHOUSE=1` plus the `CLICKHOUSE_HOST` / `CLICKHOUSE_PORT` /
   `CLICKHOUSE_USERNAME` / `CLICKHOUSE_PASSWORD` / `CLICKHOUSE_PROTOCOL` values populated. Without
   `CLICKHOUSE=1`, the env zod schema picks the disabled variant of the union and `env.clickhouse`
   resolves to `null`, which makes the cron exit at the very first line every minute.

2. _`Evaluating metric alert rules count=0` every minute._ The evaluator is alive but doesn't see
   any enabled rules for the demo org. If you ran with `--no-rules` and haven't created a rule yet
   via the UI, this is expected — create one and the next cron tick will pick it up. Otherwise the
   per-org `metricAlertRules` feature flag probably didn't take effect — query
   `select feature_flags from organizations where slug like 'live-alerts-demo-%' order by created_at desc limit 1`
   to confirm.

3. _`Evaluating metric alert rules count=7` every minute but `transitionCount=0`._ The evaluator
   sees our rules but the ClickHouse data isn't breaching. Check that the script's own log lines are
   showing `pushed=N ops` with successful status. If `usage POST returned 4xx`, the schema may not
   be published correctly. If they're 200, the materialized view may not be aggregating fast enough
   — give it 30-60 more seconds.

4. _No `Completed task ... evaluateMetricAlertRules` lines at all._ The workflows service isn't
   running, or the cron didn't register. Restart `pnpm dev:hive`.

**Webhook bodies never appear in the terminal** Notifications fire only on the FIRING and RESOLVED
transitions. Intermediate transitions (PENDING, RECOVERING) don't fire webhooks. If you've seen
FIRING in the UI but no webhook, check the workflows service logs for notification dispatch errors.

**The line chart on the detail page shows zero / empty** Materialized views in ClickHouse aggregate
from the raw `operations` table to `operations_minutely` on a short delay. Give it 30–60 seconds. If
still empty, check that the usage service is healthy.

## Expected terminal output

```
🔍 Preflight checks…
   ✓ Port 9999 free
   ✓ API server reachable
   ✓ Usage service reachable

📡 Webhook receiver listening on http://localhost:9999

🚀 Provisioning demo org for live-alerts-demo-1715520000000@localhost.localhost…
   ✓ Organization: live-alerts-demo-1715520000000
   ✓ Feature flag metricAlertRules=true
   ✓ Project: demo, target: production
   ✓ Schema published
   ✓ Webhook channel created
   ✓ 7 rules created
   ✓ Pre-seeded ~60s of breach data

┌─ Demo ready ───────────────────────────────────────
│ Email:      live-alerts-demo-1715520000000@localhost.localhost
│ Open in UI: http://localhost:3000/live-alerts-demo-1715520000000/demo/production/alerts/rules
│
│ The alerts pages refresh every 15s. The cron evaluator
│ runs every minute. Expect the first NORMAL → PENDING →
│ FIRING transitions for rules 1, 5, 6, 7 within ~1-2 minutes
│ and rule 3 (with confirmationMinutes=1) within ~2 minutes.
└────────────────────────────────────────────────────

▶ Starting main loop. Press Ctrl+C to stop.

[14:23:01] ═══ injecting=BREACH for ~3min ════════════════════════════════════════════
           expect: rules 1,5,6,7 → FIRING within ~2 ticks; rule 2 transient PENDING then NORMAL (PERCENTAGE_CHANGE settles to 0); rule 3 → PENDING then FIRING (confirm 1m); rule 4 → recovers
[14:23:01]   tick 0 — pushed 20 ops (50% errors, p95=2000ms)
[14:23:06]   tick 1 — pushed 20 ops (50% errors, p95=2000ms)
…
[14:26:01] ═══ injecting=NORMAL for ~3min ════════════════════════════════════════════
           expect: rules 1,5,6,7 → RECOVERING then NORMAL; rule 4 → FIRING (zero traffic falls below its 10/min floor); rule 3 → RECOVERING then NORMAL
[14:26:01]   tick 0 — no traffic injected (silence is the breach for rule 4)
[14:26:06]   tick 1 — no traffic injected (silence is the breach for rule 4)
…
📨 [2026-05-12T14:25:12.000Z] webhook POST /alert
{
  "state": "firing",
  "alert": { "name": "Traffic spike (> 50 req/min)", "type": "TRAFFIC", … },
  "currentValue": 240,
  …
}
```
