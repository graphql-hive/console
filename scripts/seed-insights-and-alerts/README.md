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
- Three alert channels (Slack/Webhook/MS Teams via webhooks — Slack tokens aren't available in local
  dev, so all three use webhook endpoints).
- 7 metric alert rules covering every state in the evaluation state machine (NORMAL, PENDING,
  FIRING, RECOVERING) across the three rule types (latency, reliability, traffic) and both threshold
  modes (fixed value, percentage change). The seed deliberately leaves headroom inside the
  per-target cap of 10 so a tester can exercise the create flow end-to-end.

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

| Variable          | Default | What it controls                                                  |
| ----------------- | ------- | ----------------------------------------------------------------- |
| `SEED_DAYS_PAST`  | `30`    | Days of history to seed (operations, alert state log, incidents). |
| `SEED_DAYS_AHEAD` | `7`     | Days into the future the alert state-log `expires_at` extends.    |
| `SEED_BATCH_SIZE` | `500`   | Operations per ClickHouse ingestion batch.                        |
| `SEED_RULE_LIMIT` | unset   | Cap the number of alert rules seeded. Useful for fast iteration.  |

Fast iteration loop (~10–15s instead of minutes):

```sh
SEED_DAYS_PAST=3 SEED_RULE_LIMIT=3 pnpm seed:insights-and-alerts
```

### Architecture — metric-first signal generation

For each alert rule, the script first plans a list of incident windows (`buildRuleSignals`) then
generates per-minute ClickHouse operations that make the rule's metric actually breach its threshold
during those windows (`signalToOps`). Postgres state-log + incident rows are emitted from the same
windows, so the chart's plotted data and the status bar's red/yellow/green segments agree at every
viewing resolution.

See the section divider comments in `seed-insights-and-alerts.mts`:

- Operation generation (~lines 147–473)
- Rule shapes / scenarios (~lines 1148–1310)
- Per-rule signal → ops (~lines 1810–1900)
- Bulk DB writes for state log + incidents + rule state (~lines 1925–2030)
