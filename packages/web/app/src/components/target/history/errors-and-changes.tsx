import { ReactElement } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { BoxIcon, CheckIcon } from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { Label, Label as LegacyLabel } from '@/components/common';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { PulseIcon } from '@/components/ui/icon';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';
import { CheckCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';

export function labelize(message: string) {
  // Replace '...' and "..." with <Label>...</Label>
  return reactStringReplace(message.replace(/"/g, "'"), /'((?:[^'\\]|\\.)+?)'/g, (match, i) => (
    <Label key={i}>{match.replace(/\\'/g, "'")}</Label>
  ));
}

const severityLevelMapping = {
  [SeverityLevelType.Safe]: clsx('text-emerald-400'),
  [SeverityLevelType.Dangerous]: clsx('text-yellow-400'),
} as Record<SeverityLevelType, string>;

const ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment = graphql(`
  fragment ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment on SchemaCheckConditionalBreakingChangeMetadata {
    settings {
      retentionInDays
      targets {
        slug
        target {
          id
          slug
        }
      }
    }
  }
`);

const ChangesBlock_SchemaChangeApprovalFragment = graphql(`
  fragment ChangesBlock_SchemaChangeApprovalFragment on SchemaChangeApproval {
    approvedBy {
      id
      displayName
    }
    cliApprovalMetadata {
      displayName
      email
    }
    approvedAt
    schemaCheckId
  }
`);

const ChangesBlock_SchemaChangeWithUsageFragment = graphql(`
  fragment ChangesBlock_SchemaChangeWithUsageFragment on SchemaChange {
    path
    message(withSafeBasedOnUsageNote: false)
    severityLevel
    severityReason
    approval {
      ...ChangesBlock_SchemaChangeApprovalFragment
    }
    isSafeBasedOnUsage
    usageStatistics {
      topAffectedOperations {
        hash
        name
        countFormatted
        percentageFormatted
      }
      topAffectedClients {
        name
        countFormatted
        percentageFormatted
      }
    }
    affectedAppDeployments(first: 5) {
      edges {
        cursor
        node {
          id
          name
          version
          affectedOperations(first: 5) {
            edges {
              cursor
              node {
                hash
                name
              }
            }
          }
          totalAffectedOperations
        }
      }
      totalCount
    }
  }
`);

export const ChangesBlock_SchemaChangeFragment = graphql(`
  fragment ChangesBlock_SchemaChangeFragment on SchemaChange {
    path
    message(withSafeBasedOnUsageNote: false)
    severityLevel
    severityReason
    approval {
      ...ChangesBlock_SchemaChangeApprovalFragment
    }
    isSafeBasedOnUsage
  }
`);

export function ChangesBlock(
  props: {
    title: string | React.ReactElement;
    severityLevel: SeverityLevelType;
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaCheckId: string;
    conditionBreakingChangeMetadata?: FragmentType<
      typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    > | null;
  } & (
    | {
        changesWithUsage: FragmentType<typeof ChangesBlock_SchemaChangeWithUsageFragment>[];
        changes?: undefined;
      }
    | {
        changes: FragmentType<typeof ChangesBlock_SchemaChangeFragment>[];
        changesWithUsage?: undefined;
      }
  ),
): ReactElement | null {
  return (
    <div>
      <h2 className="text-neutral-10 mb-3 font-bold">{props.title}</h2>
      <div className="list-inside list-disc space-y-2 text-sm/relaxed">
        {props.changesWithUsage?.map((change, key) => (
          <ChangeItem
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
            schemaCheckId={props.schemaCheckId}
            key={key}
            change={null}
            changeWithUsage={change}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
        {props.changes?.map((change, key) => (
          <ChangeItem
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
            schemaCheckId={props.schemaCheckId}
            key={key}
            change={change}
            changeWithUsage={null}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function ChangeItem(
  props: {
    conditionBreakingChangeMetadata: FragmentType<
      typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    > | null;
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaCheckId: string;
  } & (
    | {
        change: FragmentType<typeof ChangesBlock_SchemaChangeFragment>;
        changeWithUsage: null;
      }
    | {
        change: null;
        changeWithUsage: FragmentType<typeof ChangesBlock_SchemaChangeWithUsageFragment>;
      }
  ),
) {
  const cchange = useFragment(ChangesBlock_SchemaChangeFragment, props.change);
  const cchangeWithUsage = useFragment(
    ChangesBlock_SchemaChangeWithUsageFragment,
    props.changeWithUsage,
  );

  // at least one prop must be provided :)
  const change = (cchange ?? cchangeWithUsage)!;

  const metadata = useFragment(
    ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment,
    props.conditionBreakingChangeMetadata,
  );

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div
              className={clsx(
                'text-left',
                (change.approval && 'text-neutral-2') ||
                  (severityLevelMapping[change.severityLevel] ?? 'text-red-400'),
              )}
            >
              <div>
                <span className="text-neutral-10">{labelize(change.message)}</span>
                {change.isSafeBasedOnUsage && (
                  <span className="cursor-pointer text-yellow-500">
                    {' '}
                    <CheckIcon className="inline size-3" /> Safe based on usage data
                  </span>
                )}
                {'usageStatistics' in change && change.usageStatistics && (
                  <>
                    {' '}
                    <span className="bg-neutral-5 inline-flex items-center space-x-1 rounded-sm px-2 py-1 align-middle font-bold">
                      <PulseIcon className="h-4 stroke-[1px]" />
                      <span className="text-xs">
                        {change.usageStatistics.topAffectedOperations.length}
                        {change.usageStatistics.topAffectedOperations.length > 10 ? '+' : ''}{' '}
                        {change.usageStatistics.topAffectedOperations.length === 1
                          ? 'operation'
                          : 'operations'}{' '}
                        by {change.usageStatistics.topAffectedClients.length}{' '}
                        {change.usageStatistics.topAffectedClients.length === 1
                          ? 'client'
                          : 'clients'}{' '}
                        affected
                      </span>
                    </span>
                  </>
                )}
                {'affectedAppDeployments' in change && change.affectedAppDeployments?.totalCount ? (
                  <>
                    {' '}
                    <span className="inline-flex items-center space-x-1 rounded-sm bg-orange-500 px-2 py-1 align-middle font-bold">
                      <BoxIcon className="size-4 stroke-[2px]" />
                      <span className="text-xs">
                        {change.affectedAppDeployments.totalCount}{' '}
                        {change.affectedAppDeployments.totalCount === 1
                          ? 'app deployment'
                          : 'app deployments'}{' '}
                        affected
                      </span>
                    </span>
                  </>
                ) : null}
                {change.approval && (
                  <>
                    {' '}
                    <ApprovedByBadge approval={change.approval} />
                  </>
                )}
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">
          {change.approval && (
            <SchemaChangeApproval
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId={props.schemaCheckId}
              approval={change.approval}
            />
          )}
          {'usageStatistics' in change && change.usageStatistics && metadata ? (
            <div>
              <h4 className="text-neutral-12 mb-1 text-sm font-medium">
                Affected Operations (based on usage)
              </h4>
              <div className="text-neutral-10 mb-2 flex justify-between text-sm">
                <span>
                  Top 10 operations and clients affected by this change based on usage data.
                </span>
                {metadata && (
                  <span className="text-neutral-11 text-xs">
                    See{' '}
                    {metadata.settings.targets.map((target, index, arr) => (
                      <>
                        {!target.target ? (
                          <TooltipProvider key={index}>
                            <Tooltip>
                              <TooltipTrigger>{target.slug}</TooltipTrigger>
                              <TooltipContent>Target does no longer exist.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Link
                            key={index}
                            className="text-neutral-2 hover:text-neutral-2"
                            to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
                            params={{
                              organizationSlug: props.organizationSlug,
                              projectSlug: props.projectSlug,
                              targetSlug: target.target.slug,
                              coordinate: change.path!.join('.'),
                            }}
                            target="_blank"
                          >
                            {target.slug}
                          </Link>
                        )}
                        {index === arr.length - 1
                          ? null
                          : index === arr.length - 2
                            ? ' and '
                            : ', '}
                      </>
                    ))}{' '}
                    target insights for live usage data.
                  </span>
                )}
              </div>
              <div className="flex space-x-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Operation Name</TableHead>
                      <TableHead className="text-right">Total Requests</TableHead>
                      <TableHead className="text-right">% of traffic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {change.usageStatistics.topAffectedOperations.map(
                      ({ hash, name, countFormatted, percentageFormatted }) => (
                        <TableRow key={hash}>
                          <TableCell className="font-medium">
                            <Popover>
                              <PopoverTrigger className="text-neutral-2 hover:text-neutral-2 hover:underline hover:underline-offset-4">
                                {hash.substring(0, 4)}_{name}
                              </PopoverTrigger>
                              <PopoverContent side="right">
                                <div className="flex flex-col gap-y-2 text-sm">
                                  View live usage on
                                  {metadata.settings.targets.map((target, i) =>
                                    target.target ? (
                                      <p key={i}>
                                        <Link
                                          className="text-neutral-2 hover:text-neutral-2"
                                          to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                                          params={{
                                            organizationSlug: props.organizationSlug,
                                            projectSlug: props.projectSlug,
                                            targetSlug: target.target.slug,
                                            operationName: `${hash.substring(0, 4)}_${name}`,
                                            operationHash: hash,
                                          }}
                                          target="_blank"
                                        >
                                          {target.slug}
                                        </Link>{' '}
                                        <span className="text-neutral-12">target</span>
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Client Name</TableHead>
                      <TableHead className="text-right">Total Requests</TableHead>
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
              {'affectedAppDeployments' in change &&
              change.affectedAppDeployments?.edges?.length ? (
                <div className="mt-6">
                  <h4 className="text-neutral-12 mb-1 text-sm font-medium">
                    Affected App Deployments
                  </h4>
                  <p className="text-neutral-10 mb-2 text-sm">
                    Top 5 active app deployments that have operations using this schema coordinate.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">App Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead className="text-right">Affected Operations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {change.affectedAppDeployments.edges.map(({ node: deployment }) => (
                        <TableRow key={deployment.id}>
                          <TableCell className="font-medium">
                            <Link
                              to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                              params={{
                                organizationSlug: props.organizationSlug,
                                projectSlug: props.projectSlug,
                                targetSlug: props.targetSlug,
                                appName: deployment.name,
                                appVersion: deployment.version,
                              }}
                              search={{ coordinates: change.path?.join('.') }}
                              className="text-neutral-11 hover:text-neutral-12"
                            >
                              {deployment.name}
                            </Link>
                          </TableCell>
                          <TableCell>{deployment.version}</TableCell>
                          <TableCell className="text-right">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="link" className="h-auto p-0">
                                  {deployment.totalAffectedOperations}{' '}
                                  {deployment.totalAffectedOperations === 1
                                    ? 'operation'
                                    : 'operations'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="left" className="w-80">
                                <div className="space-y-2">
                                  <h5 className="text-neutral-12 font-medium">
                                    Affected Operations
                                  </h5>
                                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                                    {deployment.affectedOperations.edges.map(({ node: op }) => (
                                      <li key={op.hash} className="text-neutral-11">
                                        {op.name || `[anonymous] (${op.hash.substring(0, 8)}...)`}
                                      </li>
                                    ))}
                                  </ul>
                                  <Link
                                    to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                                    params={{
                                      organizationSlug: props.organizationSlug,
                                      projectSlug: props.projectSlug,
                                      targetSlug: props.targetSlug,
                                      appName: deployment.name,
                                      appVersion: deployment.version,
                                    }}
                                    search={{ coordinates: change.path?.join('.') }}
                                    className="text-neutral-2 block pt-2 text-sm hover:underline"
                                  >
                                    Show all ({deployment.totalAffectedOperations}) affected
                                    operations
                                  </Link>
                                </div>
                                <PopoverArrow />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {change.affectedAppDeployments.totalCount > 5 && (
                    <Link
                      to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId/affected-deployments"
                      params={{
                        organizationSlug: props.organizationSlug,
                        projectSlug: props.projectSlug,
                        targetSlug: props.targetSlug,
                        schemaCheckId: props.schemaCheckId,
                      }}
                      search={{ coordinate: change.path?.join('.') }}
                      className="text-neutral-2 mt-2 block text-sm hover:underline"
                    >
                      View all ({change.affectedAppDeployments.totalCount}) affected app deployments
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          ) : 'affectedAppDeployments' in change && change.affectedAppDeployments?.edges?.length ? (
            <div>
              <h4 className="text-neutral-12 mb-1 text-sm font-medium">Affected App Deployments</h4>
              <p className="text-neutral-10 mb-2 text-sm">
                Top 5 active app deployments that have operations using this schema coordinate.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">App Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Affected Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {change.affectedAppDeployments.edges.map(({ node: deployment }) => (
                    <TableRow key={deployment.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                            appName: deployment.name,
                            appVersion: deployment.version,
                          }}
                          search={{ coordinates: change.path?.join('.') }}
                          className="text-neutral-11 hover:text-neutral-12"
                        >
                          {deployment.name}
                        </Link>
                      </TableCell>
                      <TableCell>{deployment.version}</TableCell>
                      <TableCell className="text-right">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="link" className="h-auto p-0">
                              {deployment.totalAffectedOperations}{' '}
                              {deployment.totalAffectedOperations === 1
                                ? 'operation'
                                : 'operations'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="left" className="w-80">
                            <div className="space-y-2">
                              <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
                              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                                {deployment.affectedOperations.edges.map(({ node: op }) => (
                                  <li key={op.hash} className="text-neutral-11">
                                    {op.name || `[anonymous] (${op.hash.substring(0, 8)}...)`}
                                  </li>
                                ))}
                              </ul>
                              <Link
                                to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                                params={{
                                  organizationSlug: props.organizationSlug,
                                  projectSlug: props.projectSlug,
                                  targetSlug: props.targetSlug,
                                  appName: deployment.name,
                                  appVersion: deployment.version,
                                }}
                                search={{ coordinates: change.path?.join('.') }}
                                className="text-neutral-2 block pt-2 text-sm hover:underline"
                              >
                                Show all ({deployment.totalAffectedOperations}) affected operations
                              </Link>
                            </div>
                            <PopoverArrow />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {change.affectedAppDeployments.totalCount > 5 && (
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId/affected-deployments"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                    targetSlug: props.targetSlug,
                    schemaCheckId: props.schemaCheckId,
                  }}
                  search={{ coordinate: change.path?.join('.') }}
                  className="text-neutral-2 mt-2 block text-sm hover:underline"
                >
                  View all ({change.affectedAppDeployments.totalCount}) affected app deployments
                </Link>
              )}
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ApprovedByBadge(props: {
  approval: FragmentType<typeof ChangesBlock_SchemaChangeApprovalFragment>;
}) {
  const approval = useFragment(ChangesBlock_SchemaChangeApprovalFragment, props.approval);
  const approvalName =
    approval.approvedBy?.displayName ?? approval.cliApprovalMetadata?.displayName ?? '<unknown>';

  return (
    <span className="cursor-pointer text-green-500">
      <CheckIcon className="inline size-3" /> Approved by {approvalName}
    </span>
  );
}

function SchemaChangeApproval(props: {
  approval: FragmentType<typeof ChangesBlock_SchemaChangeApprovalFragment>;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
}) {
  const approval = useFragment(ChangesBlock_SchemaChangeApprovalFragment, props.approval);
  const approvalName =
    approval.approvedBy?.displayName ?? approval.cliApprovalMetadata?.displayName ?? '<unknown>';
  const approvalDate = format(new Date(approval.approvedAt), 'do MMMM yyyy');
  const schemaCheckPath =
    '/' +
    [
      props.organizationSlug,
      props.projectSlug,
      props.targetSlug,
      'checks',
      approval.schemaCheckId,
    ].join('/');

  return (
    <div className="mb-3">
      This breaking change was manually{' '}
      {approval.schemaCheckId === props.schemaCheckId ? (
        <>
          {' '}
          approved by {approvalName} in this schema check on {approvalDate}.
        </>
      ) : (
        <a href={schemaCheckPath} className="text-neutral-2 hover:underline">
          approved by {approvalName} on {approvalDate}.
        </a>
      )}
    </div>
  );
}

export const CompositionErrorsSection_SchemaErrorConnection = graphql(`
  fragment CompositionErrorsSection_SchemaErrorConnection on SchemaErrorConnection {
    edges {
      node {
        message
      }
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
        {compositionErrors?.edges?.map((edge, index) => (
          <li key={index} className="mb-1 ml-[1.25em] list-[square] pl-0 marker:pl-1">
            <CompositionError message={edge.node.message} />
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
        <h2 className="text-neutral-12 text-base font-medium">No Graph Changes</h2>
      </div>
      <p className="text-neutral-10 text-xs">There are no changes in this graph for this graph.</p>
    </div>
  );
}
