/**
 * Union and interface fields in the builder, against Hive's own schema.
 *
 * What each preview should show:
 *
 * - UnionExpansion: `tokenInfo` is a union at the top level, so it has a chevron
 *   and two `... on` rows under it. Ticking `tokenInfo` alone writes
 *   `tokenInfo { __typename }`, and Run returns data rather than a 400. That is
 *   the reported bug: it used to write a bare `tokenInfo` with no selection set.
 *
 * - SharedFieldNames: CompositeSchema and SingleSchema share six field names. The
 *   seeded document selects `id` under CompositeSchema only, so on load exactly
 *   one of the two identically named `id` rows is ticked. Ticking the other must
 *   not disturb the first.
 *
 * - InterfaceExpansion: `schemaCheck` is an interface. Its own fields stay where
 *   they were, with `... on FailedSchemaCheck` and `... on SuccessfulSchemaCheck`
 *   below them carrying only what each implementation adds.
 *
 * - LegacyDocument: a document the builder did not write. The tree should expand
 *   to its fragment rows on load, the named fragment spread should survive every
 *   edit untouched, and unticking the last field inside a fragment must leave the
 *   editor alive. An emptied `... on X` prints without braces and does not parse,
 *   which would freeze every row at once.
 *
 * - AbstractSearch: search `canBeApproved`. Every hit is inside a branch
 *   (`... on FailedSchemaCheck`), and before branches were crawled this returned
 *   nothing at all. `commit` finds the field under `... on PushedSchemaLog` and
 *   `... on CompositeSchema` as well as on plain object types. In list mode a
 *   branch reads `on CompositeSchema`, never the encoded `on:CompositeSchema`.
 *   `singleschema` must match nothing: matching runs on field names, so the
 *   spelling of a branch's own type is not searchable. Avoid `service` and
 *   `composite` as checks; real fields are named `ownedByServiceNames` and
 *   `compositeSchemaSDL`, so those terms are legitimately noisy.
 */
import { createPreview, type NavPath } from 'react-foundry';
import { Laboratory } from '../../src/components/laboratory/laboratory';
import { devCollections } from '../collections';
import { devOperations, devTabIdFor, devTabs } from '../operations';
import { devPreflight } from '../preflight';

export const nav: NavPath = 'Laboratory/Abstract types';

const LaboratoryWith = ({ activeTabId }: { activeTabId: string }) => (
  <Laboratory
    enableDocs
    theme="dark"
    defaultEndpoint={`${window.location.origin}/graphql`}
    defaultCollections={devCollections}
    defaultOperations={devOperations}
    defaultTabs={devTabs}
    defaultActiveTabId={activeTabId}
    defaultPreflight={devPreflight}
  />
);

export const UnionExpansion = createPreview({
  label: 'Union expansion',
  render: () => <LaboratoryWith activeTabId={devTabIdFor('dev-op-me')} />,
});

export const SharedFieldNames = createPreview({
  label: 'Shared field names',
  render: () => <LaboratoryWith activeTabId={devTabIdFor('dev-op-shared-field-names')} />,
});

export const InterfaceExpansion = createPreview({
  label: 'Interface expansion',
  render: () => <LaboratoryWith activeTabId={devTabIdFor('dev-op-me')} />,
});

export const LegacyDocument = createPreview({
  label: 'Legacy document',
  render: () => <LaboratoryWith activeTabId={devTabIdFor('dev-op-legacy-fragments')} />,
});

export const AbstractSearch = createPreview({
  label: 'Abstract search',
  render: () => <LaboratoryWith activeTabId={devTabIdFor('dev-op-shared-field-names')} />,
});
