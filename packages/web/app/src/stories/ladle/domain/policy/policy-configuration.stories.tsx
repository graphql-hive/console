import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Policy / Configuration',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Policy Configuration Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Schema policy configuration components for enforcing GraphQL schema standards and best
        practices. Includes customizable rules for naming conventions, deprecations, field
        requirements, and more.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>policy-settings.tsx - Main policy configuration page</li>
        <li>policy-list-item.tsx - Individual policy rule item</li>
        <li>policy-config-box.tsx - Policy configuration container</li>
        <li>rules-configuration/ - Rule-specific config components</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Rule Configuration Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>index.tsx - Main rules configuration orchestrator</li>
        <li>boolean-config.tsx - On/off toggle rules</li>
        <li>enum-config.tsx - Select from predefined options</li>
        <li>multiselect-config.tsx - Multiple option selection</li>
        <li>string-config.tsx - Text input configuration</li>
        <li>severity-toggle.tsx - Error/Warning severity selector</li>
        <li>naming-convention-rule-editor.tsx - Naming pattern editor</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Schema Policy Rules</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Common policy rules:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Require descriptions on types/fields</li>
          <li>Enforce naming conventions (camelCase, PascalCase, etc.)</li>
          <li>Deprecation usage rules</li>
          <li>Field/argument nullability requirements</li>
          <li>Enum value formatting</li>
          <li>Input object validation</li>
          <li>Directive usage restrictions</li>
          <li>Type prefix/suffix requirements</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy Settings Page</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Page structure:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Header with enable/disable policy toggle</li>
          <li>Policy status indicator</li>
          <li>List of all available rules</li>
          <li>Each rule shows: name, description, status, severity</li>
          <li>Click rule to expand configuration</li>
          <li>Save changes button</li>
          <li>Reset to defaults option</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy List Item</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Structure:
┌─────────────────────────────────────────┐
│ ✓ REQUIRE_DEPRECATION_REASON           │
│   All deprecated fields must have       │
│   a deprecation reason                  │
│                                         │
│   [Error ▼] [Configure >]              │
└─────────────────────────────────────────┘`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Checkbox to enable/disable rule</li>
          <li>Rule name (identifier)</li>
          <li>Description explaining the rule</li>
          <li>Severity dropdown (Error/Warning)</li>
          <li>Configure button to expand options</li>
          <li>Collapsible configuration panel</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy Config Box</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Container component:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Wraps rule configuration UI</li>
          <li>Provides consistent styling</li>
          <li>Handles expand/collapse animation</li>
          <li>Shows rule-specific config form</li>
          <li>Apply/Cancel buttons</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Boolean Config</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Simple on/off rules:
<BooleanConfig
  enabled={true}
  onChange={(enabled) => {}}
  label="Require field descriptions"
  description="All fields must have descriptions"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Used for:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Rules with no configuration options</li>
          <li>Just toggle on/off</li>
          <li>Examples: require descriptions, allow certain directives</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Enum Config</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Select from predefined options:
<EnumConfig
  value="SCREAMING_SNAKE_CASE"
  options={[
    { value: "SCREAMING_SNAKE_CASE", label: "SCREAMING_SNAKE_CASE" },
    { value: "camelCase", label: "camelCase" },
    { value: "PascalCase", label: "PascalCase" }
  ]}
  onChange={(value) => {}}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Used for:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Naming convention styles</li>
          <li>Strictness levels (strict, moderate, lenient)</li>
          <li>Format preferences</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Multiselect Config</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Multiple option selection:
<MultiselectConfig
  values={["ID", "String", "Int"]}
  options={[
    "ID", "String", "Int", "Float", "Boolean",
    "DateTime", "JSON"
  ]}
  onChange={(values) => {}}
  label="Allowed scalar types"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Used for:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Allow/deny lists</li>
          <li>Permitted directives</li>
          <li>Allowed scalar types</li>
          <li>Checkbox group interface</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">String Config</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Text input configuration:
<StringConfig
  value="api_"
  onChange={(value) => {}}
  label="Type name prefix"
  placeholder="e.g., api_"
  description="Required prefix for all type names"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Used for:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Required prefixes/suffixes</li>
          <li>Custom patterns</li>
          <li>Regex expressions</li>
          <li>Description templates</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Severity Toggle</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">Error</code>
          <span className="text-neutral-11 text-xs">- Schema check fails (blocks publish)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Warning</code>
          <span className="text-neutral-11 text-xs">- Shows warning (allows publish)</span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">UI:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Toggle between Error and Warning</li>
          <li>Color-coded badges (red for error, yellow for warning)</li>
          <li>Per-rule severity configuration</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Naming Convention Rule Editor</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Advanced naming pattern editor:

Type Names: PascalCase
Field Names: camelCase
Enum Values: SCREAMING_SNAKE_CASE
Input Object Names: PascalCase + "Input" suffix

Custom patterns:
- Regex: ^[A-Z][a-zA-Z0-9]*$
- Prefix: api_
- Suffix: _type
- Exceptions: Query, Mutation, Subscription`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Per-entity-type naming rules</li>
          <li>Preset patterns (camelCase, PascalCase, etc.)</li>
          <li>Custom regex patterns</li>
          <li>Prefix/suffix requirements</li>
          <li>Exception list (names to ignore)</li>
          <li>Preview with examples</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy Enforcement</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">On schema check/publish:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Schema SDL submitted</li>
          <li>Policy rules evaluated</li>
          <li>Violations detected and categorized</li>
          <li>Error violations block publish</li>
          <li>Warning violations allow publish but notify</li>
          <li>Detailed violation report generated</li>
          <li>Client receives pass/fail result</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Policy Violation Report</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Schema Check Failed: 3 errors, 2 warnings

Errors:
❌ REQUIRE_FIELD_DESCRIPTION
   Field "User.email" is missing a description
   Location: User.email (line 15)

❌ NAMING_CONVENTION
   Type "user_profile" must be PascalCase
   Location: user_profile (line 42)

Warnings:
⚠️  DEPRECATION_REASON
   Deprecated field "oldField" should have a reason
   Location: Query.oldField (line 8)`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Example Policy Configuration</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`{
  "rules": {
    "REQUIRE_FIELD_DESCRIPTION": {
      "enabled": true,
      "severity": "error"
    },
    "NAMING_CONVENTION": {
      "enabled": true,
      "severity": "error",
      "config": {
        "types": "PascalCase",
        "fields": "camelCase",
        "enumValues": "SCREAMING_SNAKE_CASE"
      }
    },
    "DEPRECATION_REASON": {
      "enabled": true,
      "severity": "warning"
    },
    "ALLOWED_DIRECTIVES": {
      "enabled": true,
      "severity": "error",
      "config": {
        "allowed": ["deprecated", "key", "requires"]
      }
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Benefits of Schema Policies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Consistent schema quality across team</li>
        <li>Catch issues before production</li>
        <li>Enforce organizational standards</li>
        <li>Improve schema documentation</li>
        <li>Prevent common mistakes</li>
        <li>Maintain naming consistency</li>
        <li>Gradual enforcement (warnings → errors)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>UpdateSchemaPolicy - Save policy configuration</li>
        <li>EnableSchemaPolicy - Turn on policy enforcement</li>
        <li>DisableSchemaPolicy - Turn off enforcement</li>
        <li>ResetSchemaPolicy - Reset to defaults</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>SchemaPolicy - Current policy configuration</li>
        <li>AvailablePolicyRules - List of all rule definitions</li>
        <li>PolicyViolations - Historical violations</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations and queries</li>
        <li>Form components - Rule configuration</li>
        <li>Checkbox - Rule enable/disable</li>
        <li>Select - Enum and severity selection</li>
        <li>Accordion - Collapsible rule config</li>
        <li>Badge - Severity indicators</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Project-level policy configuration</li>
        <li>Per-rule enable/disable granularity</li>
        <li>Configurable severity (error vs warning)</li>
        <li>Rule-specific configuration options</li>
        <li>Naming convention with regex support</li>
        <li>Violations block or warn on schema checks</li>
        <li>Detailed violation reports for debugging</li>
        <li>Policy templates for common setups</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components configure schema policies with
        customizable rules and enforcement levels using GraphQL mutations. See actual usage in
        project policy settings pages.
      </p>
    </div>
  </div>
);
