import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Project / Alerts',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Project Alerts Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Alert management components for monitoring schema changes and events. Includes alert
        configuration, channel setup (Slack, webhook), and alert delivery management.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Alert Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>alerts-table.tsx - List of configured alerts</li>
        <li>create-alert.tsx - Create new alert configuration</li>
        <li>delete-alerts-button.tsx - Delete alert confirmation</li>
        <li>channels-table.tsx - List of notification channels</li>
        <li>create-channel.tsx - Set up notification channel</li>
        <li>delete-channels-button.tsx - Remove channel</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Alerts Table</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Name (alert identifier)
- Type (Schema Change, Failed Check, etc.)
- Channel (where notifications go)
- Enabled (toggle)
- Created (date)
- Actions (Edit, Delete)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Enable/disable toggle per alert</li>
          <li>Sort by name, type, created date</li>
          <li>Filter by alert type</li>
          <li>Create alert button</li>
          <li>Bulk delete (select multiple)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Alert Types</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">SCHEMA_CHANGE</code>
          <span className="text-neutral-11 text-xs">- Notify on any schema publish</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">SCHEMA_CHECK_FAILED</code>
          <span className="text-neutral-11 text-xs">- Breaking changes detected</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">SCHEMA_CHECK_SUCCEEDED</code>
          <span className="text-neutral-11 text-xs">- Schema check passed</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">HIGH_ERROR_RATE</code>
          <span className="text-neutral-11 text-xs">- Operations failing above threshold</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">HIGH_LATENCY</code>
          <span className="text-neutral-11 text-xs">- Slow operation performance</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Alert</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Alert Name: String (required)
- Alert Type: Dropdown (Schema Change, Failed Check, etc.)
- Channel: Select from existing channels
- Conditions: (varies by type)
  - For High Error Rate: Threshold % (e.g., 5%)
  - For High Latency: Threshold ms (e.g., 1000)
- Target(s): Which targets to monitor
  - All targets
  - Specific targets (multi-select)
- Enabled: Boolean (default true)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Workflow:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Click "Create Alert" button</li>
          <li>Select alert type</li>
          <li>Configure type-specific settings</li>
          <li>Choose notification channel</li>
          <li>Scope to specific targets (optional)</li>
          <li>Save alert</li>
          <li>Alert activates immediately if enabled</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Channels Table</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Name (channel identifier)
- Type (Slack, Webhook, Email)
- Destination (URL, channel name, email)
- Created (date)
- Actions (Test, Edit, Delete)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Test channel button (send test notification)</li>
          <li>Edit channel configuration</li>
          <li>Delete with confirmation</li>
          <li>Create channel button</li>
          <li>Shows alerts using each channel</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Channel Types</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Slack:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Webhook URL from Slack app</li>
            <li>Channel name (e.g., #alerts)</li>
            <li>Rich formatted messages</li>
            <li>Inline action buttons</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Webhook:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>POST to custom URL</li>
            <li>JSON payload with alert data</li>
            <li>Custom headers (optional)</li>
            <li>Retry logic on failure</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Email:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Email address(es)</li>
            <li>Multiple recipients (comma-separated)</li>
            <li>HTML formatted emails</li>
            <li>Link to view details in Hive</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Channel</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`# Slack Channel
- Name: "Team Slack"
- Type: Slack
- Webhook URL: https://hooks.slack.com/...

# Webhook Channel
- Name: "PagerDuty"
- Type: Webhook
- URL: https://events.pagerduty.com/...
- Headers: { "Authorization": "Token abc..." }

# Email Channel
- Name: "DevOps Team"
- Type: Email
- Recipients: devops@company.com, alerts@company.com`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Alert Notification Payload</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`{
  "type": "SCHEMA_CHANGE",
  "project": "my-api",
  "target": "production",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "schemaVersionId": "v123",
    "publishedBy": "john@example.com",
    "changes": [
      {
        "type": "FIELD_ADDED",
        "path": "User.email",
        "breaking": false
      }
    ],
    "url": "https://app.hive.com/.../history"
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Delete Alerts Button</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Confirmation dialog:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows alert name(s) being deleted</li>
          <li>Warning about losing alert history</li>
          <li>Destructive action styling</li>
          <li>Requires explicit confirmation</li>
          <li>Immediately stops notifications</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Delete Channels Button</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Confirmation with checks:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows channel name being deleted</li>
          <li>Lists alerts using this channel</li>
          <li>Warning: alerts will become inactive</li>
          <li>Option to reassign alerts to different channel</li>
          <li>Destructive action requires confirmation</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Test Channel Feature</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Send test notification:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Button in channels table</li>
          <li>Sends sample alert payload</li>
          <li>Verifies channel configuration</li>
          <li>Shows success/error message</li>
          <li>Helps debug channel setup</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateAlert - Create new alert configuration</li>
        <li>UpdateAlert - Edit alert settings</li>
        <li>DeleteAlert - Remove alert</li>
        <li>ToggleAlert - Enable/disable alert</li>
        <li>CreateChannel - Create notification channel</li>
        <li>UpdateChannel - Edit channel details</li>
        <li>DeleteChannel - Remove channel</li>
        <li>TestChannel - Send test notification</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>ProjectAlerts - List all alerts for project</li>
        <li>AlertChannels - List all notification channels</li>
        <li>AlertHistory - Past alert deliveries</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Alert Delivery</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">When alert triggers:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Event occurs (schema publish, check failure, etc.)</li>
          <li>Alert conditions evaluated</li>
          <li>If conditions met, notification queued</li>
          <li>Notification sent to configured channel</li>
          <li>Delivery status recorded (success/failure)</li>
          <li>Retry on failure (up to 3 times)</li>
          <li>Alert history updated</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations and queries</li>
        <li>Table component - Alerts and channels lists</li>
        <li>Form components - Create/edit forms</li>
        <li>Modal/Dialog - Confirmations</li>
        <li>Toggle - Enable/disable switch</li>
        <li>Badge - Alert type indicators</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Project-level alert configuration</li>
        <li>Multiple notification channels supported</li>
        <li>Condition-based alert triggering</li>
        <li>Target scoping for granular control</li>
        <li>Test functionality for channel verification</li>
        <li>Retry logic for failed deliveries</li>
        <li>Alert history for audit trail</li>
        <li>Rich formatted notifications (Slack, email)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components manage project alerts with GraphQL
        mutations, notification channels, and event monitoring. See actual usage in project alerts
        pages.
      </p>
    </div>
  </div>
);
