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
