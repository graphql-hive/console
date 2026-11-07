import { Fragment, useMemo } from 'react';
import { Layers as MetadataIcon, PackageIcon } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import * as styles from './super-graph-metadata.css';

function stringToHue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash % 360;
}

function subgraphChipColors(str: string, theme: 'light' | 'dark') {
  const h = stringToHue(str);
  return theme === 'dark'
    ? { backgroundColor: `hsl(${h}, 45%, 32%)`, color: '#f2f2f2' }
    : { backgroundColor: `hsl(${h}, 30%, 80%)`, color: '#4f4f4f' };
}

function Metadata(props: { supergraphMetadata: Array<{ name: string; content: string }> }) {
  if (!props.supergraphMetadata.length) {
    return null;
  }
  return (
    <Popover
      trigger={
        <button type="button" aria-label="Supergraph metadata" className={styles.metadataButton}>
          <MetadataIcon className={styles.metadataMetadataIcon} />
        </button>
      }
      openOnHover
      width="auto"
      content={
        <div className={styles.metadataDiv}>
          {props.supergraphMetadata.map((m, i) => (
            <div key={i}>
              <span className={shared.weight.bold}>{m.name}:</span> {m.content}
            </div>
          ))}
        </div>
      }
    />
  );
}

function SubgraphChip(props: {
  text: string;
  tooltip: boolean;
  metadata?: Array<{ name: string; content: string }>;
}): React.ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { resolvedTheme } = useTheme();

  const inner = (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug"
      params={{
        organizationSlug,
        projectSlug,
        targetSlug,
      }}
      search={{
        service: props.text,
      }}
      style={subgraphChipColors(props.text, resolvedTheme)}
      className={styles.subgraphChipLink}
    >
      <span className={styles.subgraphChipSpan}>{props.text}</span>
      <PackageIcon size={10} className={styles.subgraphChipPackageIcon} />
      {props.metadata?.length && <span className={styles.subgraphChipSpan2}>*</span>}
    </Link>
  );

  if (!props.tooltip) {
    return inner;
  }

  return (
    <Tooltip
      trigger={inner}
      content={
        <>
          <span className={shared.weight.bold}>{props.text}</span> subgraph
          {props.metadata?.map((m, index) => (
            <Fragment key={`${index}`}>
              <br />
              <span className={shared.weight.bold}>{m.content}</span> {m.name}
            </Fragment>
          )) ?? null}
        </>
      }
    />
  );
}

const SupergraphMetadataList_SupergraphMetadataFragment = graphql(`
  fragment SupergraphMetadataList_SupergraphMetadataFragment on SupergraphMetadata {
    ownedByServiceNames
    metadata {
      name
      content
      source
    }
  }
`);

const DEFAULT_PREVIEW_THRESHOLD = 3;

export function SupergraphMetadataList(props: {
  supergraphMetadata: FragmentType<typeof SupergraphMetadataList_SupergraphMetadataFragment>;
  previewThreshold?: number;
}) {
  const previewThreshold = props.previewThreshold ?? DEFAULT_PREVIEW_THRESHOLD;
  const supergraphMetadata = useFragment(
    SupergraphMetadataList_SupergraphMetadataFragment,
    props.supergraphMetadata,
  );

  /**
   * For non-federated graphs, there are no subgraphs and so the UI has to adjust.
   * In this case, any metadata not associated with a subgraph will be placed in
   * a separate icon.
   */
  const meta = useMemo(() => {
    const nonSubgraphMeta = supergraphMetadata.metadata?.filter(m => !m.source);
    if (!nonSubgraphMeta?.length) {
      return null;
    }
    return <Metadata supergraphMetadata={nonSubgraphMeta} />;
  }, [supergraphMetadata.metadata]);

  const items = useMemo(() => {
    if (supergraphMetadata.ownedByServiceNames == null) {
      return null;
    }

    if (supergraphMetadata.ownedByServiceNames.length <= previewThreshold) {
      return [
        supergraphMetadata.ownedByServiceNames.map((serviceName, index) => {
          const meta = supergraphMetadata.metadata?.filter(({ source }) => source === serviceName);
          return (
            <SubgraphChip
              key={`${serviceName}-${index}`}
              text={serviceName}
              tooltip
              metadata={meta}
            />
          );
        }),
        null,
      ] as const;
    }

    return [
      supergraphMetadata.ownedByServiceNames
        .slice(0, previewThreshold)
        .map((serviceName, index) => {
          const meta = supergraphMetadata.metadata?.filter(({ source }) => source === serviceName);
          return (
            <SubgraphChip
              key={`${serviceName}-${index}`}
              text={serviceName}
              tooltip
              metadata={meta}
            />
          );
        }),
      supergraphMetadata.ownedByServiceNames.map((serviceName, index) => {
        const meta = supergraphMetadata.metadata?.filter(({ source }) => source === serviceName);
        return (
          <SubgraphChip
            key={`${serviceName}-${index}`}
            text={serviceName}
            tooltip={false}
            metadata={meta}
          />
        );
      }),
    ] as const;
  }, [supergraphMetadata.ownedByServiceNames]);

  if (items === null && meta === null) {
    return null;
  }

  const [previewItems, allItems] = items ?? [null, null];

  return (
    <div className={styles.supergraphMetadataListDiv}>
      {meta}
      {previewItems}
      {allItems && (
        <Popover
          trigger={
            <button type="button" className={styles.supergraphMetadataListButton}>
              + {allItems.length - previewItems.length} more
            </button>
          }
          openOnHover
          width="auto"
          content={
            <div className={styles.supergraphMetadataListDiv2}>
              <div className={styles.supergraphMetadataListDiv3}>All Subgraphs</div>
              <div className={styles.supergraphMetadataListDiv4}>
                <ScrollArea maxHeight="md">
                  <div className={styles.supergraphMetadataListDiv5}>{allItems}</div>
                </ScrollArea>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
