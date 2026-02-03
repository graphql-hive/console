import React, { ReactElement, ReactNode, useMemo } from 'react';
import { clsx } from 'clsx';
import { PulseIcon, UsersIcon } from '@/components/ui/icon';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Markdown } from '@/components/v2/markdown';
import { FragmentType, graphql, useFragment } from '@/gql';
import { formatNumber, toDecimal } from '@/lib/hooks';
import { capitalize, cn } from '@/lib/utils';
import { Link as NextLink, useRouter } from '@tanstack/react-router';
import { useDescriptionsVisibleToggle } from './provider';
import { SupergraphMetadataList } from './super-graph-metadata';
import { useExplorerFieldFiltering } from './utils';

export function Description(props: { description: string }) {
  const { isDescriptionsVisible } = useDescriptionsVisibleToggle();

  return (
    <div
      className={clsx('mb-2 mt-0 block max-w-screen-sm', {
        hidden: !isDescriptionsVisible,
      })}
    >
      <Markdown className={clsx('text-neutral-10 text-left text-sm')} content={props.description} />
    </div>
  );
}

const SchemaExplorerUsageStats_UsageFragment = graphql(`
  fragment SchemaExplorerUsageStats_UsageFragment on SchemaCoordinateUsage {
    total
    isUsed
    usedByClients
    topOperations(limit: 5) {
      count
      name
      hash
    }
  }
`);

export function SchemaExplorerUsageStats(props: {
  usage: FragmentType<typeof SchemaExplorerUsageStats_UsageFragment>;
  totalRequests: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  kindLabel?: string;
}) {
  const usage = useFragment(SchemaExplorerUsageStats_UsageFragment, props.usage);
  const percentage = props.totalRequests ? (usage.total / props.totalRequests) * 100 : 0;

  const kindLabel = useMemo(() => props.kindLabel ?? 'field', [props.kindLabel]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="ml-3 flex flex-row items-center gap-2 text-xs">
        <div className="grow">
          <div className="text-center" title={`${usage.total} requests`}>
            {formatNumber(usage.total)}
          </div>
          <div
            title={`${toDecimal(percentage)}% of all requests`}
            className="bg-neutral-2/20 relative z-0 mt-1 w-full min-w-[25px] overflow-hidden rounded-sm"
            style={{ width: 50, height: 5 }}
          >
            <div className="bg-neutral-2 z-0 h-full" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <Tooltip>
          <TooltipContent>
            <div className="z-10">
              <div className="mb-1 text-lg font-bold">{capitalize(kindLabel)} Usage</div>
              {usage.isUsed === false ? (
                <div>This {kindLabel} is currently not in use.</div>
              ) : (
                <div>
                  <ul>
                    <li>
                      This {kindLabel} has been queried in{' '}
                      <strong>{formatNumber(usage.total)}</strong> requests.
                    </li>
                    <li>
                      <strong>{toDecimal(percentage)}%</strong> of all requests use this {kindLabel}
                      .
                    </li>
                  </ul>

                  {Array.isArray(usage.topOperations) && (
                    <table className="mt-4 table-auto">
                      <thead>
                        <tr>
                          <th className="p-2 pl-0 text-left">Top 5 Operations</th>
                          <th className="p-2 text-center">Reqs</th>
                          <th className="p-2 text-center">Of total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.topOperations.map(op => (
                          <tr key={op.hash}>
                            <td className="px-2 pl-0 text-left">
                              <NextLink
                                className="text-neutral-2 hover:text-neutral-2 hover:underline hover:underline-offset-2"
                                to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                                params={{
                                  organizationSlug: props.organizationSlug,
                                  projectSlug: props.projectSlug,
                                  targetSlug: props.targetSlug,
                                  operationName: `${op.hash.substring(0, 4)}_${op.name}`,
                                  operationHash: op.hash,
                                }}
                              >
                                {op.hash.substring(0, 4)}_{op.name}
                              </NextLink>
                            </td>
                            <td className="px-2 text-center font-bold">{formatNumber(op.count)}</td>
                            <td className="px-2 text-center font-bold">
                              {toDecimal((op.count / props.totalRequests) * 100)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
          <TooltipTrigger>
            <div className="cursor-help text-xl">
              <PulseIcon className="h-6 w-auto" />
            </div>
          </TooltipTrigger>
        </Tooltip>

        <Tooltip>
          <TooltipContent>
            <>
              <div className="mb-1 text-lg font-bold">Client Usage</div>

              {Array.isArray(usage.usedByClients) && usage.usedByClients.length > 0 ? (
                <>
                  <div className="mb-2">This {kindLabel} is used by the following clients:</div>
                  <ul>
                    {usage.usedByClients.map(clientName => (
                      <li key={clientName} className="font-bold">
                        <NextLink
                          className="text-neutral-2 hover:text-neutral-2 hover:underline hover:underline-offset-2"
                          to="/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                            name: clientName,
                          }}
                        >
                          {clientName}
                        </NextLink>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div>This {kindLabel} is not used by any client.</div>
              )}
            </>
          </TooltipContent>
          <TooltipTrigger>
            <div className="cursor-help p-1 text-xl">
              <UsersIcon size={16} className="h-6 w-auto" />
            </div>
          </TooltipTrigger>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

const GraphQLInputFields_InputFieldFragment = graphql(`
  fragment GraphQLInputFields_InputFieldFragment on GraphQLInputField {
    name
    description
    type
    isDeprecated
    deprecationReason
    supergraphMetadata {
      metadata {
        name
        content
      }
    }
    usage {
      total
      ...SchemaExplorerUsageStats_UsageFragment
    }
  }
`);

const GraphQLTypeCard_SupergraphMetadataFragment = graphql(`
  fragment GraphQLTypeCard_SupergraphMetadataFragment on SupergraphMetadata {
    ...SupergraphMetadataList_SupergraphMetadataFragment
  }
`);

export function DeprecationNote(props: {
  deprecationReason: string | null | undefined;
  children: ReactNode;
}) {
  if (!props.deprecationReason) {
    return <>{props.children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger className="line-through hover:line-through">
          {props.children}
        </TooltipTrigger>
        <TooltipContent className="min-w-6 max-w-screen-md" side="right" sideOffset={5}>
          <div className="mb-2">Deprecation reason</div>
          <Markdown className="text-neutral-10" content={props.deprecationReason} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GraphQLTypeCard(props: {
  kind: string;
  name: string;
  description?: string | null;
  implements?: string[];
  totalRequests?: number;
  usage?: FragmentType<typeof SchemaExplorerUsageStats_UsageFragment>;
  supergraphMetadata?: FragmentType<typeof GraphQLTypeCard_SupergraphMetadataFragment> | null;
  targetSlug: string;
  projectSlug: string;
  organizationSlug: string;
  children: ReactNode;
}): ReactElement {
  const supergraphMetadata = useFragment(
    GraphQLTypeCard_SupergraphMetadataFragment,
    props.supergraphMetadata,
  );

  return (
    <div className="border-neutral-5 rounded-md border-2">
      <div className="flex flex-row justify-between p-4">
        <div>
          <div className="flex flex-row items-center gap-2">
            <div className="text-neutral-10 font-normal">{props.kind}</div>
            <div className="font-semibold">
              <GraphQLTypeAsLink
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                type={props.name}
              />
            </div>
          </div>
          {props.description && <Description description={props.description} />}
        </div>
        {Array.isArray(props.implements) && props.implements.length > 0 && (
          <div className="text-neutral-10 flex flex-row items-center text-sm">
            <div className="mx-2">implements</div>
            <div className="flex flex-row gap-2">
              {props.implements.map(t => (
                <GraphQLTypeAsLink
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  key={t}
                  type={t}
                />
              ))}
            </div>
          </div>
        )}
        {props.usage && typeof props.totalRequests !== 'undefined' && (
          <SchemaExplorerUsageStats
            kindLabel={props.kind}
            totalRequests={props.totalRequests}
            usage={props.usage}
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
          />
        )}
        {supergraphMetadata && (
          <SupergraphMetadataList
            targetSlug={props.targetSlug}
            projectSlug={props.projectSlug}
            organizationSlug={props.organizationSlug}
            supergraphMetadata={supergraphMetadata}
          />
        )}
      </div>
      <div>{props.children}</div>
    </div>
  );
}

export function GraphQLTypeCardListItem(props: {
  children: ReactNode;
  index: number;
  className?: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <div
      onClick={props.onClick}
      className={clsx(
        'flex flex-row items-center justify-between p-4 text-sm',
        props.index % 2 ? '' : 'bg-neutral-2/50',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function GraphQLInputFields(props: {
  typeName: string;
  fields: FragmentType<typeof GraphQLInputFields_InputFieldFragment>[];
  totalRequests?: number;
  targetSlug: string;
  projectSlug: string;
  organizationSlug: string;
}): ReactElement {
  const fields = useFragment(GraphQLInputFields_InputFieldFragment, props.fields);

  const sortedAndFilteredFields = useExplorerFieldFiltering({
    fields,
  });

  return (
    <div className="flex flex-col">
      {sortedAndFilteredFields.map((field, i) => {
        const coordinate = `${props.typeName}.${field.name}`;
        return (
          <GraphQLTypeCardListItem key={field.name} index={i}>
            <div>
              <div className="flex w-full flex-row items-center justify-between">
                <div className="text-neutral-10">
                  <DeprecationNote deprecationReason={field.deprecationReason}>
                    <LinkToCoordinatePage
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                      coordinate={coordinate}
                      className="text-neutral-12 font-semibold"
                    >
                      {field.name}
                    </LinkToCoordinatePage>
                  </DeprecationNote>
                  <span className="mr-1">:</span>
                  <GraphQLTypeAsLink
                    organizationSlug={props.organizationSlug}
                    projectSlug={props.projectSlug}
                    targetSlug={props.targetSlug}
                    className="font-semibold"
                    type={field.type}
                  />
                </div>
                {typeof props.totalRequests === 'number' && (
                  <SchemaExplorerUsageStats
                    totalRequests={props.totalRequests}
                    usage={field.usage}
                    targetSlug={props.targetSlug}
                    projectSlug={props.projectSlug}
                    organizationSlug={props.organizationSlug}
                  />
                )}
              </div>
              {field.description && <Description description={field.description} />}
            </div>
          </GraphQLTypeCardListItem>
        );
      })}
    </div>
  );
}

export function GraphQLTypeAsLink(props: {
  type: string;
  className?: string;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const router = useRouter();
  const typename = props.type.replace(/[[\]!]+/g, '');

  return (
    <Popover>
      <PopoverTrigger className={cn('hover:underline hover:underline-offset-4', props.className)}>
        {props.type}
      </PopoverTrigger>
      <PopoverContent side="right">
        <div className="flex flex-col gap-y-2">
          <p>
            <NextLink
              className="text-sm font-normal hover:underline hover:underline-offset-2"
              to="/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                typename,
              }}
              search={router.latestLocation.search}
            >
              Visit in <span className="font-bold">Explorer</span>
            </NextLink>
            <span className="text-neutral-10 text-xs"> - displays a full type</span>
          </p>
          <p>
            <NextLink
              className="text-sm font-normal hover:underline hover:underline-offset-2"
              to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                coordinate: typename,
              }}
              search={router.latestLocation.search}
            >
              Visit in <span className="font-bold">Insights</span>
            </NextLink>
            <span className="text-neutral-10 text-xs"> - usage insights</span>
          </p>
        </div>
        <PopoverArrow />
      </PopoverContent>
    </Popover>
  );
}

export const LinkToCoordinatePage = React.forwardRef<
  HTMLAnchorElement,
  {
    coordinate: string;
    children: ReactNode;
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    className?: string;
  }
>((props, ref) => {
  const router = useRouter();

  return (
    <NextLink
      ref={ref}
      className={cn('hover:underline hover:underline-offset-2', props.className)}
      to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
      params={{
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
        coordinate: props.coordinate,
      }}
      search={router.latestLocation.search}
    >
      {props.children}
    </NextLink>
  );
});

const getRandomWidth = () => {
  const values = ['w-32', 'w-48', 'w-64', 'w-96'];

  return values[Math.floor(Math.random() * values.length)];
};

export const GraphQLFieldsSkeleton = (props: { count?: number }) => {
  const widths = useMemo(() => {
    const count = props.count ?? 5;

    return Array.from({ length: count }, () => getRandomWidth());
  }, [props.count]);

  return (
    <div className="flex w-full flex-col">
      {widths.map((width, index) => (
        <GraphQLTypeCardListItem key={index} index={index} className="w-full">
          <div className="flex w-full flex-row items-center gap-2">
            <Skeleton className={cn('bg-neutral-3 my-1 h-4', width)} />
            <div className="ml-auto flex flex-row items-center gap-2">
              <Skeleton className="bg-neutral-3 my-1 size-4" />
              <Skeleton className="bg-neutral-3 my-1 size-4" />
              <Skeleton className="bg-neutral-3 my-1 size-4" />
            </div>
          </div>
        </GraphQLTypeCardListItem>
      ))}
    </div>
  );
};

export const GraphQLTypeCardSkeleton = (props: { children: ReactNode }) => {
  return (
    <div className="border-neutral-2 rounded-md border-2">
      <div className="flex flex-row justify-between p-4">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="bg-neutral-3 my-1 h-4 w-32" />
        </div>
      </div>
      <div>{props.children}</div>
    </div>
  );
};
