## Readme

Seeds data for the Insights and Alerts features — operations history, saved filters, alert channels,
alert rules, and the matching state-log + incident history. Useful for local UI work, Storybook
fixtures, and E2E preparation.

What gets created:

- An owner account, organization, project, and federated target.
- Schema published with `seed-insights-and-alerts` schemas.
- Per-minute baseline operations across the configured time range, plus per-rule "signal" operations
  engineered to make each alert rule's metric actually breach its threshold during the planned
  incident windows. The chart, status bar, and events table on the alert detail page all derive from
  this one shared timeline (metric-first signal generation).
- ~10 saved filters with realistic view counts.
- Alert channels — a preview-only Slack destination plus a PagerDuty webhook. The Slack channel is a
  real `SLACK`-type row inserted straight into Postgres (no bot token needed, fixed name
  `#hive-alerts-testing`), so the alert form's Slack preview renders; it never delivers, since this
  seed dispatches nothing.
- 7 metric alert rules covering every state in the evaluation state machine (NORMAL, PENDING,
  FIRING, RECOVERING) across the three rule types (latency, reliability, traffic) and both threshold
  modes (fixed value, percentage change). The seed deliberately leaves headroom inside the
  per-target cap of 10 so a tester can exercise the create flow end-to-end.

### Usage limits

Creating an organization always applies the column defaults (HOBBY's 7-day retention and 1M
operations) whatever plan you pick at the prompt, so the seed writes the limits the plan actually
grants, from `USAGE_DEFAULT_LIMITATIONS`. A seeded org then behaves like the plan it claims, which
keeps rate-limit and retention states testable.

Retention also decides how far back it is worth writing at all: it is applied at ingestion as
`expires_at = timestamp + retention`, so anything older arrives already expired and ClickHouse TTLs
it straight back out. The seed therefore backfills `min(SEED_DAYS_PAST, <plan retention>)` days, and
says so when it clamps.

| Plan       | Retention | Backfill at `SEED_DAYS_PAST=30` |
| ---------- | --------- | ------------------------------- |
| HOBBY      | 7 days    | 7 days                          |
| PRO        | 90 days   | 30 days                         |
| ENTERPRISE | 365 days  | 30 days                         |

**Pick PRO or ENTERPRISE for the full 30 days.** Alert history (`ALERT_DAYS_PAST`) is clamped
alongside, so incidents cover the same range as the operations behind them.

One wait is unavoidable: the limiter caches these limits and only refreshes every
`LIMIT_CACHE_UPDATE_INTERVAL_MS` (60s), and collection stamps `expires_at` from that cache. The seed
polls the commerce service until the new retention is live before sending anything, which is usually
the slowest part of startup. Override the URL with `COMMERCE_ENDPOINT` if it is not on
`http://localhost:4013`.

### Prerequisites

- Docker Compose is running (`pnpm local:setup`).
- Hive services are up (`pnpm dev:hive`).

### Usage

```sh
pnpm seed:insights-and-alerts
```

The script prompts for an email address to use for the seeded owner account:

- **Existing email** — the script reuses that user and creates a fresh session for it. The new org /
  project / target are owned by that user.
- **New email** — the script signs up a new user with that email through the normal Hive signup
  flow.
- **Empty input** — the script generates a unique placeholder email
  (`<random>-<timestamp>@localhost.localhost`) and signs up a new user with it. Useful for one-off
  throwaway seeds.

Everything else is non-interactive.

### Configuration

Override defaults with environment variables:

| Variable          | Default | What it controls                                                 |
| ----------------- | ------- | ---------------------------------------------------------------- |
| `SEED_DAYS_PAST`  | `30`    | Days of history to seed, capped by the plan's retention.         |
| `SEED_DAYS_AHEAD` | `7`     | Days into the future the alert state-log `expires_at` extends.   |
| `SEED_BATCH_SIZE` | `500`   | Operations per usage-report request (not the ClickHouse batch).  |
| `SEED_RULE_LIMIT` | unset   | Cap the number of alert rules seeded. Useful for fast iteration. |

Fast iteration loop (~10–15s instead of minutes):

```sh
SEED_DAYS_PAST=3 SEED_RULE_LIMIT=3 pnpm seed:insights-and-alerts
```

### Why local ClickHouse raises `max_partitions_per_insert_block`

`operations_by_target_minutely` and `coordinate_counts_minutely` partition by
`toStartOfHour(timestamp)` (ClickHouse migrations `018` and `020`, both added after this seed was
written). Backfilling N days therefore puts `N * 24` distinct hours into the data, and an INSERT
block spanning more than `max_partitions_per_insert_block` hours is rejected with code 252 — which
the default `SEED_DAYS_PAST=30` does reliably against ClickHouse's default of `100`.

`SEED_BATCH_SIZE` is not a lever against this. The usage service buffers incoming reports and emits
one Kafka message per 990KB or 5s (`packages/services/usage/src/usage.ts`), and each message becomes
exactly one INSERT — so a smaller batch size just packs proportionally more reports into the same
message, spanning the same hours.

The ingestor cannot survive the rejection: it never commits its Kafka offset, so it replays the same
messages, fails identically, and loops, duplicating rows on every pass until it exhausts memory.

The seed could in principle pause longer than the usage service's `KAFKA_BUFFER_INTERVAL` (5s)
between sub-100-hour groups to force a flush boundary, but that costs ~40s and hinges on a setting
the seed does not own. So `docker/configs/clickhouse-dev/insert-partitions.xml` raises the ceiling
to `10000` instead, mounted only by `docker-compose.dev.yml`. Integration tests keep the stock
default, and production talks to an externally managed ClickHouse that never reads it.

Against a ClickHouse still on `100`, use `SEED_DAYS_PAST=4` or lower. The symptom otherwise is a
seed reporting every batch accepted (the usage service acks before ClickHouse sees the data) while
the UI stays empty and consumer lag sits frozen. To recover, stop the ingestor — offsets can only be
altered while the group has no members — then skip the poisoned messages and start it again:

```sh
docker exec hive-dev-broker-1 rpk group seek usage-ingestor-v2 --to end --topics usage_reports_v2
```

### Architecture — metric-first signal generation

For each alert rule, the script first plans a list of incident windows (`buildRuleSignals`) then
generates per-minute ClickHouse operations that make the rule's metric actually breach its threshold
during those windows (`signalToOps`). Postgres state-log + incident rows are emitted from the same
windows, so the chart's plotted data and the status bar's red/yellow/green segments agree at every
viewing resolution.

Follow it through `seed-insights-and-alerts.mts` in this order:

- `ruleShapes` — the rule definitions and the scenario each one stages
- `buildRuleSignals` — plans the incident windows for a rule
- `signalToOps` — turns a planned window into operations that breach the threshold
- The "Bulk-insert state log + incidents" block — writes the Postgres side of those windows
