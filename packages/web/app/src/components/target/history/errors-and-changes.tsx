import { ReactElement } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { CheckIcon } from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { Label, Label as LegacyLabel } from '@/components/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heading } from '@/components/v2';
import { PulseIcon } from '@/components/v2/icon';
import { FragmentType, graphql, useFragment } from '@/gql';
import { CriticalityLevel, SchemaChangeFieldsFragment } from '@/graphql';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';
import { CheckCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';

export function labelize(message: string) {
  // Turn " into '
  // Replace '...' with <Label>...</Label>
  return reactStringReplace(message.replace(/"/g, "'"), /'([^']+)'/gim, (match, i) => {
    return <Label key={i}>{match}</Label>;
  });
}

const criticalityLevelMapping = {
  [CriticalityLevel.Safe]: clsx('text-emerald-400'),
  [CriticalityLevel.Dangerous]: clsx('text-yellow-400'),
} as Record<CriticalityLevel, string>;

const ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment = graphql(`
  fragment ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment on SchemaCheckConditionalBreakingChangeMetadata {
    settings {
      retentionInDays
      targets {
        name
        target {
          id
          cleanId
        }
      }
    }
  }
`);

export function ChangesBlock(props: {
  title: string | React.ReactElement;
  criticality: CriticalityLevel;
  changes: SchemaChangeFieldsFragment[];
  conditionBreakingChangeMetadata?: FragmentType<
    typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
  > | null;
}): ReactElement | null {
  return (
    <div>
      <h2 className="mb-3 font-bold text-gray-900 dark:text-white">{props.title}</h2>
      <div className="list-inside list-disc space-y-2 text-sm leading-relaxed">
        {props.changes.map((change, key) => (
          <ChangeItem
            key={key}
            change={change}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function ChangeItem(props: {
  change: SchemaChangeFieldsFragment;
  conditionBreakingChangeMetadata: FragmentType<
    typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
  > | null;
}) {
  const router = useRouteSelector();
  const { change } = props;

  const metadata = useFragment(
    ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment,
    props.conditionBreakingChangeMetadata,
  );

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="py-3 hover:no-underline">
          <div
            className={clsx(
              (!!change.approval && 'text-orange-500') ||
                (criticalityLevelMapping[change.criticality] ?? 'text-red-400'),
            )}
          >
            <div className="inline-flex justify-start space-x-2">
              <span className="text-gray-600 dark:text-white">{labelize(change.message)}</span>
              {change.isSafeBasedOnUsage && (
                <span className="cursor-pointer text-yellow-500">
                  {' '}
                  <CheckIcon className="inline size-3" /> Safe based on usage data
                </span>
              )}
              {change.usageStatistics && (
                <span className="flex items-center space-x-1 rounded-sm bg-gray-800 px-2 font-bold">
                  <PulseIcon className="h-6 stroke-[1px]" />
                  <span className="text-xs">
                    {change.usageStatistics.topAffectedOperations.length}
                    {change.usageStatistics.topAffectedOperations.length > 10 ? '+' : ''}{' '}
                    {change.usageStatistics.topAffectedOperations.length === 1
                      ? 'operation'
                      : 'operations'}{' '}
                    by {change.usageStatistics.topAffectedClients.length}{' '}
                    {change.usageStatistics.topAffectedClients.length === 1 ? 'client' : 'clients'}{' '}
                    affected
                  </span>
                </span>
              )}
              {change.approval ? (
                <div className="self-end">
                  <ApprovedByBadge approval={change.approval} />
                </div>
              ) : null}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-8 pt-4">
          {change.approval && <SchemaChangeApproval approval={change.approval} />}
          {change.usageStatistics && metadata ? (
            <div>
              <div className="flex space-x-4">
                <Table>
                  <TableCaption>Top 10 affected operations.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Operation Name</TableHead>
                      <TableHead>Total Requests</TableHead>
                      <TableHead className="text-right">% of traffic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {change.usageStatistics.topAffectedOperations.map(
                      ({ hash, name, countFormatted, percentageFormatted }) => (
                        <TableRow key={hash}>
                          <TableCell className="font-medium">
                            <Popover>
                              <PopoverTrigger className="text-orange-500 hover:text-orange-500 hover:underline hover:underline-offset-4">
                                {hash.substring(0, 4)}_{name}
                              </PopoverTrigger>
                              <PopoverContent side="right">
                                <div className="flex flex-col gap-y-2 text-sm">
                                  View live usage on
                                  {metadata.settings.targets.map(target =>
                                    target.target ? (
                                      <p>
                                        <Link
                                          className="text-orange-500 hover:text-orange-500"
                                          href={{
                                            pathname:
                                              '/[organizationId]/[projectId]/[targetId]/insights/[operationName]/[operationHash]',
                                            query: {
                                              organizationId: router.organizationId,
                                              projectId: router.projectId,
                                              targetId: target.target.cleanId,
                                              operationName: `${hash.substring(0, 4)}_${name}`,
                                              operationHash: hash,
                                            },
                                          }}
                                          target="_blank"
                                        >
                                          {target.name}
                                        </Link>{' '}
                                        <span className="text-white">target</span>
                                      </p>
                                    ) : null,
                                  )}
                                </div>
                                <PopoverArrow />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">{countFormatted}</TableCell>
                          <TableCell className="text-right">{percentageFormatted}</TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
                <Table>
                  <TableCaption>Top 10 affected clients.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Client Name</TableHead>
                      <TableHead>Total Requests</TableHead>
                      <TableHead className="text-right">% of traffic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {change.usageStatistics.topAffectedClients.map(
                      ({ name, countFormatted, percentageFormatted }) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-right">{countFormatted}</TableCell>
                          <TableCell className="text-right">{percentageFormatted}</TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end pt-2 text-xs text-gray-100">
                {metadata && (
                  <span>
                    See{' '}
                    {metadata.settings.targets.map((target, index, arr) => (
                      <>
                        {/* eslint-disable-next-line unicorn/no-negated-condition */}
                        {!target.target ? (
                          <TooltipProvider key={index}>
                            <Tooltip>
                              <TooltipTrigger>{target.name}</TooltipTrigger>
                              <TooltipContent>Target does no longer exist.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Link
                            key={index}
                            className="text-orange-500 hover:text-orange-500 "
                            href={{
                              pathname:
                                '/[organizationId]/[projectId]/[targetId]/insights/schema-coordinate/[coordinate]',
                              query: {
                                organizationId: router.organizationId,
                                projectId: router.projectId,
                                targetId: target.target.cleanId,
                                coordinate: change.path?.join('.'),
                              },
                            }}
                            target="_blank"
                          >
                            {target.name}
                          </Link>
                        )}
                        {index === arr.length - 1 ? null : index === arr.length - 2 ? 'and' : ','}
                      </>
                    ))}{' '}
                    target{metadata.settings.targets.length > 1 && 's'} insights for live usage
                    data.
                  </span>
                )}
              </div>
            </div>
          ) : change.criticality === CriticalityLevel.Breaking ? (
            <>{change.criticalityReason ?? 'No details available for this breaking change.'}</>
          ) : (
            <>No details available for this change.</>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ApprovedByBadge(props: {
  approval: Exclude<SchemaChangeFieldsFragment['approval'], null | undefined>;
}) {
  const approvalName = props.approval.approvedBy?.displayName ?? '<unknown>';

  return (
    <span className="cursor-pointer text-green-500">
      <CheckIcon className="inline size-3" /> Approved by {approvalName}
    </span>
  );
}

function SchemaChangeApproval(props: {
  approval: Exclude<SchemaChangeFieldsFragment['approval'], null | undefined>;
}) {
  const approvalName = props.approval.approvedBy?.displayName ?? '<unknown>';
  const approvalDate = format(new Date(props.approval.approvedAt), 'do MMMM yyyy');
  const route = useRouteSelector();
  const schemaCheckPath =
    '/' +
    [
      route.organizationId,
      route.projectId,
      route.targetId,
      'checks',
      props.approval.schemaCheckId,
    ].join('/');

  return (
    <div className="mb-3">
      This breaking change was manually{' '}
      {props.approval.schemaCheckId === route.schemaCheckId ? (
        <>
          {' '}
          approved by {approvalName} in this schema check on {approvalDate}.
        </>
      ) : (
        <Link href={schemaCheckPath} className="text-orange-500 hover:underline">
          approved by {approvalName} on {approvalDate}.
        </Link>
      )}
    </div>
  );
}

const CompositionErrorsSection_SchemaErrorConnection = graphql(`
  fragment CompositionErrorsSection_SchemaErrorConnection on SchemaErrorConnection {
    nodes {
      message
    }
  }
`);

export function CompositionErrorsSection(props: {
  compositionErrors: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
}) {
  const compositionErrors = useFragment(
    CompositionErrorsSection_SchemaErrorConnection,
    props.compositionErrors,
  );

  return (
    <div className="mb-2 px-2">
      <TooltipProvider>
        <Heading className="my-2">
          Composition Errors
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon-sm" className="ml-2">
                <InfoCircledIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-4 font-normal">
              <p>
                If composition errors occur it is impossible to generate a supergraph and public API
                schema.
              </p>
              <p className="mt-1">
                Composition errors can be caused by changes to the underlying schemas that causes
                conflicts with other subgraphs.
              </p>
            </TooltipContent>
          </Tooltip>
        </Heading>
      </TooltipProvider>
      <ul>
        {compositionErrors?.nodes.map((change, index) => (
          <li key={index} className="mb-1 ml-[1.25em] list-[square] pl-0 marker:pl-1">
            <CompositionError message={change.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompositionError(props: { message: string }) {
  return reactStringReplace(
    reactStringReplace(
      reactStringReplace(props.message, /"([^"]+)"/g, (match, index) => {
        return <LegacyLabel key={match + index}>{match}</LegacyLabel>;
      }),
      /(@[^. ]+)/g,
      (match, index) => {
        return <LegacyLabel key={match + index}>{match}</LegacyLabel>;
      },
    ),
    /Unknown type ([A-Za-z_0-9]+)/g,
    (match, index) => {
      return (
        <span key={match + index}>
          Unknown type <LegacyLabel>{match}</LegacyLabel>
        </span>
      );
    },
  );
}

export function NoGraphChanges() {
  return (
    <div className="cursor-default">
      <div className="mb-3 flex items-center gap-3">
        <CheckCircledIcon className="h-4 w-auto text-emerald-500" />
        <h2 className="text-base font-medium text-white">No Graph Changes</h2>
      </div>
      <p className="text-muted-foreground text-xs">
        There are no changes in this graph for this graph.
      </p>
    </div>
  );
}
