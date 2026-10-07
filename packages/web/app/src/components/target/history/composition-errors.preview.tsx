import { XCircleIcon } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { CallSite } from '@/components/inventory/shared';
import { CompositionErrorMessage } from './composition-error-message';
import { CompositionErrorsPopover } from './composition-errors-popover';

export const nav: NavPath = 'Components/CompositionErrors';

/**
 * Every composition error message shape that can reach the UI, through `CompositionErrorMessage`
 * in both list containers. Messages arrive as one string each, straight from the composer that
 * produced them (native or Apollo Federation v2, Federation v1, graphql-js validation, or the schema
 * service itself), so each fixture is a library template with neutral names; `A1` is a real
 * production message.
 *
 * Both containers are transcribed: the version-page card is page-local, and the checks-page list
 * still carries the old renderer until it is switched over.
 */

type Fixture = { id: string; label: string; message: string };

/** Satisfiability errors. Both Federation v2 composers emit the same skeleton. */
const SATISFIABILITY: readonly Fixture[] = [
  {
    id: 'A1',
    label: 'one subgraph, one reason (the screenshot; Apollo placeholders)',
    message: `The following supergraph API query:
{
  custodianAccount(id: "<any id>") {
    balances {
      currentBalance(securityId: "<any id>", positionDirection: LONG) {
        positionDirection
      }
    }
  }
}
cannot be satisfied by the subgraphs because:
- from subgraph "balance-service": cannot find field "Balance.positionDirection".`,
  },
  {
    id: 'A2',
    label: 'one subgraph, nested reasons; native placeholders and a trailing "..."',
    message: `The following supergraph API query:
{
  user(id: "A string value") {
    orders {
      ...
    }
  }
}
cannot be satisfied by the subgraphs because:
- from subgraph "users":
  - cannot find field "User.orders".
  - cannot move to subgraph "orders", which has field "User.orders", because type "User" has no @key defined in subgraph "orders".`,
  },
  {
    id: 'A3',
    label: 'several subgraphs, inline fragment, input object; Apollo-only reasons',
    message: `The following supergraph API query:
{
  node(id: "<any id>") {
    ... on User {
      invoices(filter: {}) {
        total
      }
    }
  }
}
cannot be satisfied by the subgraphs because:
- from subgraph "users": cannot find field "User.invoices".
- from subgraph "billing":
  - field "User.invoices" is not resolvable because it is overridden by subgraph "invoicing".
  - cannot move to subgraph "invoicing" using @key(fields: "id") of "User", the key field(s) cannot be resolved from subgraph "billing" (please ensure that this is not due to key field "id" being accidentally marked @external).`,
  },
  {
    id: 'A4',
    label: 'mutation root',
    message: `The following supergraph API query:
mutation {
  updateUser(input: {id: "<any id>"}) {
    email
  }
}
cannot be satisfied by the subgraphs because:
- from subgraph "users": cannot find field "User.email".`,
  },
  {
    id: 'A5',
    label: 'subscription root',
    message: `The following supergraph API query:
subscription {
  orderUpdated(orderId: "A string value") {
    status
  }
}
cannot be satisfied by the subgraphs because:
- from subgraph "orders": field "Order.status" is not resolvable because marked @external.`,
  },
  {
    id: 'A6',
    label: 'Apollo top-level mutation wrapper: whole inner errors indented under a prose line',
    message: `Supergraph API queries using the mutation field "Mutation.updateUser" at top-level must be satisfiable without needing to call that field from multiple subgraphs, but every subgraph with that field encounters satisfiability errors. Please fix these satisfiability errors for (at least) one of the following subgraphs with the mutation field:
- When calling "Mutation.updateUser" at top-level from subgraph "users":
  The following supergraph API query:
  mutation {
    updateUser(input: {id: "<any id>"}) {
      email
    }
  }
  cannot be satisfied by the subgraphs because:
  - from subgraph "users": cannot find field "User.email".
- When calling "Mutation.updateUser" at top-level from subgraph "billing":
  The following supergraph API query:
  mutation {
    updateUser(input: {id: "<any id>"}) {
      name
    }
  }
  cannot be satisfied by the subgraphs because:
  - from subgraph "billing": cannot find field "User.name".`,
  },
];

/** Single-line Federation v2 rules, one per pattern the chip regexes have to survive. */
const FEDERATION_V2_RULES: readonly Fixture[] = [
  {
    id: 'B1',
    label: 'quoted coordinate, quoted subgraph list',
    message:
      'Field "User.email" is marked @external on all the subgraphs in which it is listed (subgraphs "users" and "billing").',
  },
  {
    id: 'B2',
    label: 'bare directive followed by punctuation',
    message:
      'Invalid use of @shareable on field "Node.id": only object type fields can be marked with @shareable',
  },
  {
    id: 'B3',
    label: 'directive with a quoted fieldset argument',
    message:
      'On type "User", for @key(fields: "id name"): Cannot query field "name" on type "User" (the field should either be added to this subgraph or, if it should not be resolved by this subgraph, you need to add it to this subgraph with @external).',
  },
  {
    id: 'B4',
    label: 'type comparison across subgraphs',
    message:
      'Type of field "User.id" is incompatible across subgraphs: it has type "ID!" in subgraph "users" but type "String!" in subgraph "billing"',
  },
  {
    id: 'B5',
    label: 'bracketed subgraph prefix',
    message:
      '[billing] Type "User" is an extension type, but there is no type definition for "User" in any subgraph.',
  },
  {
    id: 'B6',
    label: 'printed directive application inside the sentence',
    message: 'Cannot apply merged directive @tag(name: "internal") to external field "User.email"',
  },
  {
    id: 'B7a',
    label: 'unquoted type name (the "Unknown type" regex)',
    message: 'Unknown type Account',
  },
  {
    id: 'B7b',
    label: 'unquoted coordinates and type modifiers',
    message:
      'Interface field Node.id expects type ID! but User.id of type String! is not a proper subtype.',
  },
  {
    id: 'B8',
    label: 'URL',
    message:
      '@interfaceObject is not yet supported. See https://github.com/graphql-hive/federation-composition/issues/7',
  },
  {
    id: 'B9',
    label: 'backticks and double quotes in one message',
    message:
      'Unknown directive "@tag". If you meant the "@tag" federation directive, you should use fully-qualified name "@federation__tag" or add "@tag" to the `import` argument of the @link to the federation specification.',
  },
  {
    id: 'B10',
    label: 'multi-sentence advice',
    message:
      '@override with label (progressive override) cannot be used on field "User.name" on subgraph "users" since "User.name" on "billing" is marked with directive "@requires". Use non-progressive @override (without label) for this migration.',
  },
  {
    id: 'B11',
    label: 'directive list in parentheses (the badge preview sample)',
    message:
      'Field "User.id" is marked @external but is not used in any federation directive (@key, @provides, @requires) or to satisfy an interface; the field declaration has no use and should be removed (or the field should not be @external).',
  },
];

/** Federation v1: bracket prefixes, backtick quoting, tab-indented continuation lines. */
const FEDERATION_V1: readonly Fixture[] = [
  {
    id: 'C1',
    label: '[service] Type.field -> prefix',
    message:
      '[orders] Product.sku -> is marked as @external but is not used by a @requires, @key, or @provides directive.',
  },
  {
    id: 'C2',
    label: '[@directive] -> prefix',
    message:
      '[@tag] -> Custom directives must be implemented in every service. The following services do not implement the @tag directive: users, billing.',
  },
  {
    id: 'C3',
    label: 'bracketed service groups inside the sentence',
    message:
      'The `Role` enum does not have identical values in all services. Groups of services with identical values are: [users, billing], [orders]',
  },
  {
    id: 'C4a',
    label: 'tab-indented printed definition on a second line',
    message:
      "[@tag] -> Found @tag definition in service users, but the @tag directive definition was invalid. Please ensure the directive definition in your schema's type definitions is compatible with the following:\n\tdirective @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION",
  },
  {
    id: 'C4b',
    label: 'tab-indented list, one @key per line',
    message:
      '[billing] User -> extends from users but specifies an invalid @key directive. Valid @key directives are specified by the originating type. Available @key directives for this type are:\n\t@key(fields: "id")\n\t@key(fields: "email")',
  },
  {
    id: 'C5',
    label: 'backtick-quoted identifiers',
    message:
      '[users] Role.ADMIN -> The enum, `Role` has multiple definitions of the `ADMIN` value.',
  },
  {
    id: 'C6',
    label: 'wrong composer for the schema',
    message:
      '[users] Schema contains a Federation 2 subgraph. Only federation 1 subgraphs can be composed with the fed1 composer.',
  },
];

/** graphql-js validation (single and stitching projects) and the messages Hive writes itself. */
const GRAPHQL_AND_HIVE: readonly Fixture[] = [
  { id: 'D1', label: 'parse error', message: 'Syntax Error: Unexpected Name "typo".' },
  { id: 'D2a', label: 'validateSDL', message: 'There can be only one type named "User".' },
  { id: 'D2b', label: 'validateSDL', message: 'Field "User.id" can only be defined once.' },
  {
    id: 'D2c',
    label: 'validateSDL quotes the type name, unlike B7a',
    message: 'Unknown type "Account".',
  },
  { id: 'D2d', label: 'validateSDL', message: 'Unknown directive "@foo".' },
  {
    id: 'D2e',
    label: 'validateSDL',
    message: 'Directive "@deprecated" may not be used on OBJECT.',
  },
  {
    id: 'D3a',
    label: 'validateSchema, unquoted',
    message: 'Interface field Node.id expected but User does not provide it.',
  },
  {
    id: 'D3b',
    label: 'validateSchema, unquoted',
    message: 'Type Query must define one or more fields.',
  },
  { id: 'D3c', label: 'validateSchema', message: 'Query root type must be provided.' },
  { id: 'E1', label: 'native composer threw', message: 'Unexpected composition error.' },
  {
    id: 'E2',
    label: 'external composition timeout',
    message:
      'External composition timed out: no response from the external composition service after 30000ms',
  },
  {
    id: 'E3',
    label: 'external composition network error, quoted text with spaces',
    message:
      'A network error occurred during external composition: "ECONNREFUSED connect ECONNREFUSED 10.0.0.12:3000"',
  },
  {
    id: 'E4',
    label: 'external composition error code',
    message:
      'External composition failure: (ERR_INVALID_SIGNATURE) The signature is invalid. Please check your secret',
  },
  {
    id: 'E5',
    label: 'external composition network failure',
    message: 'External composition network failure: fetch failed',
  },
  {
    id: 'E6',
    label: 'external composition bad payload',
    message: 'External composition failure: invalid shape of data returned from service',
  },
];

const GROUPS = {
  Satisfiability: SATISFIABILITY,
  FederationV2Rules: FEDERATION_V2_RULES,
  FederationV1: FEDERATION_V1,
  GraphqlAndHive: GRAPHQL_AND_HIVE,
} as const;

const ALL: readonly Fixture[] = Object.values(GROUPS).flat();

// The select control wants a non-empty tuple, which a map over a readonly array cannot prove.
const FIXTURE_IDS = ALL.map(fixture => fixture.id) as [string, ...string[]];

/**
 * `pages/target-history-schema-version.tsx:1299-1336` with the fragment swapped for a plain array,
 * the critical row numbers and separators, a little room under the heading, and the shipped
 * renderer in each row.
 */
function VersionPageCard(props: { errors: ReadonlyArray<{ message: string }> }) {
  return (
    <div className="border-critical-line overflow-hidden rounded-xl border">
      <div className="border-critical-line bg-critical-tint-subtle flex items-start gap-3 border-b px-5 py-4">
        <div className="border-critical-line mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
          <XCircleIcon className="text-critical h-4 w-4" />
        </div>

        <div className="text-fg min-w-0">
          <h3 className="text-sm font-semibold">Supergraph not composable</h3>
          <p className="mt-0.5 text-[12.5px]">
            Errors occurred while attempting to compose the supergraph from its subgraphs.
          </p>
        </div>

        <span className="focus:ring-accent text-2xs border-critical-line bg-critical-tint text-critical ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2">
          <span className="bg-critical mr-1 h-1.5 w-1.5 rounded-full" />
          {props.errors.length} error
          {props.errors.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="text-fg flex items-center gap-2 px-5 pb-1 pt-4">
        <span className="text-sm font-medium">Composition errors</span>
        <CompositionErrorsPopover />
      </div>

      <ul className="divide-critical-line-subtle divide-y px-1 pb-2">
        {props.errors.map((err, idx) => (
          <li key={idx} className="flex gap-3 px-4 py-3">
            <span className="text-critical mt-0.5 w-6 shrink-0 select-none font-mono text-xs">
              {String(idx + 1).padStart(2, '0')}
            </span>

            <CompositionErrorMessage message={err.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** `CompositionErrorsList` chrome from `errors-and-changes.tsx:686-702` around the shipped renderer. */
function ChecksPageList(props: { errors: ReadonlyArray<{ message: string }> }) {
  return (
    <div className="mb-2 px-2">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-fg-default font-bold">Composition Errors</h2>
        <CompositionErrorsPopover />
      </div>
      <ul>
        {props.errors.map((error, index) => (
          <li key={index} className="mb-1 ml-[1.25em] list-[square] pl-0 marker:pl-1">
            <CompositionErrorMessage message={error.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Which fixture sits at which row number, since the containers show only the messages. */
function Legend(props: { fixtures: readonly Fixture[] }) {
  return (
    <ol className="text-fg-secondary grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {props.fixtures.map((fixture, index) => (
        <li key={fixture.id} className="contents">
          <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>
          <span className="font-mono">{fixture.id}</span>
          <span>{fixture.label}</span>
        </li>
      ))}
    </ol>
  );
}

function BothContainers(props: { fixtures: readonly Fixture[] }) {
  const errors = props.fixtures.map(fixture => ({ message: fixture.message }));
  return (
    <div className="flex w-[56rem] flex-col gap-8">
      <Legend fixtures={props.fixtures} />
      <CallSite source="pages/target-history-schema-version.tsx:1299-1336" origin="raw">
        <VersionPageCard errors={errors} />
      </CallSite>
      <CallSite source="components/target/history/errors-and-changes.tsx:681-704" origin="ui">
        <ChecksPageList errors={errors} />
      </CallSite>
    </div>
  );
}

export const Satisfiability = createPreview(() => <BothContainers fixtures={SATISFIABILITY} />);

export const FederationV2Rules = createPreview(() => (
  <BothContainers fixtures={FEDERATION_V2_RULES} />
));

export const FederationV1 = createPreview(() => <BothContainers fixtures={FEDERATION_V1} />);

export const GraphqlAndHive = createPreview(() => <BothContainers fixtures={GRAPHQL_AND_HIVE} />);

/** Every shape in one list, to judge how mixed items sit next to each other. */
export const Everything = createPreview(() => <BothContainers fixtures={ALL} />);

function PlaygroundView(props: { fixture: string; custom: string }) {
  const picked = ALL.find(fixture => fixture.id === props.fixture) ?? ALL[0];
  const fixture = props.custom ? { id: 'custom', label: 'pasted', message: props.custom } : picked;
  return <BothContainers fixtures={[fixture]} />;
}

/** One shape, or a message pasted from production into `custom`. */
export const Playground = createPreview({
  controls: controlsFor(PlaygroundView, {
    fixture: { type: 'select', options: FIXTURE_IDS, default: 'A1' },
    custom: { type: 'text', default: '' },
  }),
  render: v => <PlaygroundView fixture={v.fixture} custom={v.custom} />,
});

/**
 * The input before any rendering: each message as the API serves it. The web app's fragment asks
 * for `message` alone (`SchemaError.path` is never populated), so the JSON block is the whole
 * payload for one list item, with newlines and tabs showing as `\n` and `\t`. The block beside it
 * is the same string with whitespace honored.
 */
function RawStringsView(props: { group: keyof typeof GROUPS }) {
  return (
    <ol className="flex w-[56rem] flex-col gap-6">
      {GROUPS[props.group].map((fixture, index) => (
        <li key={fixture.id} className="flex flex-col gap-2">
          <div className="text-fg-secondary flex items-baseline gap-3 text-xs">
            <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-mono">{fixture.id}</span>
            <span>{fixture.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-fg-subtle text-2xs">as served</span>
              <pre className="bg-surface-inset text-fg-default overflow-x-auto whitespace-pre-wrap break-all rounded-md border px-3 py-2 font-mono text-xs leading-5">
                {JSON.stringify({ message: fixture.message }, null, 2)}
              </pre>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-fg-subtle text-2xs">same string, whitespace honored</span>
              <pre className="bg-surface-inset text-fg-default overflow-x-auto whitespace-pre rounded-md border px-3 py-2 font-mono text-xs leading-5">
                {fixture.message}
              </pre>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export const RawStrings = createPreview({
  controls: controlsFor(RawStringsView, {
    group: {
      type: 'select',
      options: ['Satisfiability', 'FederationV2Rules', 'FederationV1', 'GraphqlAndHive'],
      default: 'Satisfiability',
    },
  }),
  render: v => <RawStringsView group={v.group} />,
});
