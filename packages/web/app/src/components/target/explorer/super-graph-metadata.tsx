import { Fragment, useMemo } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { PackageIcon } from '@/components/ui/icon';
import { Tooltip } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { LayersIcon as MetadataIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';

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
    <Tooltip
      content={
        <>
          {props.supergraphMetadata.map((m, i) => (
            <div key={i}>
              <span className="font-bold">{m.name}:</span> {m.content}
            </div>
          ))}
        </>
      }
    >
      <MetadataIcon className="text-neutral-12 my-[5px] cursor-pointer" />
    </Tooltip>
  );
}

function SubgraphChip(props: {
  text: string;
  tooltip: boolean;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  metadata?: Array<{ name: string; content: string }>;
}): React.ReactElement {
  const { resolvedTheme } = useTheme();

  const inner = (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug"
      params={{
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      }}
      search={{
        service: props.text,
      }}
      style={subgraphChipColors(props.text, resolvedTheme)}
      className="my-0.5 ml-1.5 inline-flex h-6 max-w-24 cursor-pointer items-center gap-1 rounded-full px-2 text-[10px] font-normal leading-none"
    >
      <span className="min-w-0 truncate">{props.text}</span>
      <PackageIcon size={10} className="shrink-0" />
      {props.metadata?.length && <span className="shrink-0 text-[8px] font-bold">*</span>}
    </Link>
  );

  if (!props.tooltip) {
    return inner;
  }

  return (
    <Tooltip
      content={
        <>
          <span className="font-bold">{props.text}</span> subgraph
          {props.metadata?.map((m, index) => (
            <Fragment key={`${index}`}>
              <br />
              <span className="font-bold">{m.content}</span> {m.name}
            </Fragment>
          )) ?? null}
        </>
      }
    >
      {inner}
    </Tooltip>
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
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
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
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
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
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
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
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
    <div className="flex w-full justify-end gap-1">
      {meta}
      {previewItems}
      {allItems && (
        <Tooltip
          content={
            <>
              <div className="mb-2 font-bold">All Subgraphs</div>
              <div className="flex max-h-[250px] w-[250px] flex-wrap gap-1 overflow-y-auto py-1">
                {allItems}
              </div>
            </>
          }
          contentProps={{ className: 'z-10' }}
        >
          <span className="text-neutral-12 flex cursor-pointer items-center pl-1 text-xs font-bold">
            + {allItems.length - previewItems.length} more
          </span>
        </Tooltip>
      )}
    </div>
  );
}
