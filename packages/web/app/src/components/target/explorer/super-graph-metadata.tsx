import { useMemo } from 'react';
import { PackageIcon } from '@/components/ui/icon';
import { Tooltip } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { LayersIcon as MetadataIcon } from '@radix-ui/react-icons';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Link } from '@tanstack/react-router';

function stringToHslColor(str: string, s = 30, l = 80) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
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
      <MetadataIcon className="my-[5px] cursor-pointer text-white" />
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
  const inner = (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug"
      params={{
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      }}
      // TODO(router)
      hash={`service-${props.text}`}
      style={{ backgroundColor: stringToHslColor(props.text) }}
      className="my-[2px] ml-[6px] inline-block h-[22px] max-w-[100px] cursor-pointer items-center justify-between truncate rounded-[16px] py-0 pl-[8px] pr-[6px] text-[10px] font-normal normal-case leading-loose text-[#4f4f4f] drop-shadow-md"
    >
      {props.text}
      <PackageIcon size={10} className="ml-1 inline-block" />
      {props.metadata?.length ? <span className="inline-block text-[8px] font-bold">*</span> : null}
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
            <React.Fragment key={`${m.name}-${index}`}>
              <br />
              <span className="font-bold">{m.content}</span> {m.name}
            </React.Fragment>
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

const tooltipColor = 'rgb(36, 39, 46)';
const previewThreshold = 3;

export function SupergraphMetadataList(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  supergraphMetadata: FragmentType<typeof SupergraphMetadataList_SupergraphMetadataFragment>;
}) {
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
    <TooltipProvider delayDuration={100}>
      <div className="flex w-full justify-end">
        {meta}
        {previewItems}{' '}
        {allItems ? (
          <Tooltip
            content={
              <>
                <div className="mb-2 font-bold">All Subgraphs</div>
                <div className="relative size-[250px]">
                  <div className="absolute inset-0 size-[250px] overflow-y-scroll py-2">
                    {allItems}
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      boxShadow: `inset 0px 11px 8px -10px ${tooltipColor}, inset 0px -11px 8px -10px ${tooltipColor}`,
                    }}
                  />
                </div>
              </>
            }
            contentProps={{ className: 'z-10' }}
          >
            <span className="flex cursor-pointer items-center pl-1 text-xs font-bold text-white">
              + {allItems.length - previewItems.length} more
            </span>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
