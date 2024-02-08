import { ReactElement, useMemo } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { CheckIcon, UsersIcon } from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { Label, Label as LegacyLabel } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heading } from '@/components/v2';
import { PulseIcon } from '@/components/v2/icon';
import { Tooltip as LegacyTooltip } from '@/components/v2/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { CriticalityLevel, SchemaChangeFieldsFragment } from '@/graphql';
import { formatNumber } from '@/lib/hooks';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';
import { CheckCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';

export function labelize(message: string) {
  // Turn " into '
  // Replace '...' with <Label>...</Label>
  return reactStringReplace(message.replace(/"/g, "'"), /'([^']+)'/gim, (match, i) => {
    return <Label key={i}>{match}</Label>;
  });
}

const titleMap: Record<CriticalityLevel, string> = {
  Safe: 'Safe Changes',
  Breaking: 'Breaking Changes',
  Dangerous: 'Dangerous Changes',
};

const criticalityLevelMapping = {
  [CriticalityLevel.Safe]: clsx('text-emerald-400'),
  [CriticalityLevel.Dangerous]: clsx('text-yellow-400'),
} as Record<CriticalityLevel, string>;

export function ChangesBlock(props: {
  changes: SchemaChangeFieldsFragment[];
  criticality: CriticalityLevel;
  retentionInDays?: number;
}): ReactElement | null {
  const router = useRouteSelector();

  console.log({ changes: props.changes });

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {titleMap[props.criticality]}
      </h2>
      <ul className="list-inside list-disc space-y-2 pl-3 text-sm leading-relaxed">
        {props.changes.map((change, key) => (
          <li
            key={key}
            className={clsx(
              criticalityLevelMapping[props.criticality] ?? 'text-red-400',
              ' my-1 flex space-x-2',
            )}
          >
            <MaybeWrapTooltip tooltip={change.criticalityReason ?? null}>
              <span className="text-gray-600 dark:text-white">{labelize(change.message)}</span>
            </MaybeWrapTooltip>
            {change.affectedOperations?.length ? (
              <LegacyTooltip.Provider delayDuration={0}>
                <LegacyTooltip
                  content={
                    <>
                      <div className="text-lg font-bold">Usage</div>
                      <table className="mt-2 table-auto">
                        <thead>
                          <tr>
                            <th className="p-2 pl-0 text-left">Top 10 Operations</th>
                            <th className="p-2 text-center">Reqs (last 7 days)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {change.affectedOperations.map(({ hash, name, count }) => (
                            <tr key={hash}>
                              <td className="px-2 pl-0 text-left">
                                <Link
                                  className="text-orange-500 hover:text-orange-500 hover:underline hover:underline-offset-2"
                                  href={{
                                    pathname:
                                      '/[organizationId]/[projectId]/[targetId]/insights/[operationName]/[operationHash]',
                                    query: {
                                      organizationId: router.organizationId,
                                      projectId: router.projectId,
                                      targetId: router.targetId,
                                      operationName: `${hash.substring(0, 4)}_${name}`,
                                      operationHash: hash,
                                      period: `${props.retentionInDays || 7}d`,
                                    },
                                  }}
                                >
                                  {hash.substring(0, 4)}_{name}
                                </Link>
                              </td>
                              <td className="px-2 text-center font-bold">{formatNumber(count)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 border-t border-t-gray-700 pt-2 text-xs text-gray-100">
                        <span>
                          Go to{' '}
                          <Link
                            className="text-orange-500 hover:text-orange-500 hover:underline hover:underline-offset-2"
                            href={{
                              pathname:
                                '/[organizationId]/[projectId]/[targetId]/insights/schema-coordinate/[coordinate]',
                              query: {
                                organizationId: router.organizationId,
                                projectId: router.projectId,
                                targetId: router.targetId,
                                coordinate: change.path?.join('.'),
                                period: `${props.retentionInDays || 7}d`,
                              },
                            }}
                          >
                            Insights
                          </Link>{' '}
                          to see live usage data.
                        </span>
                      </div>
                    </>
                  }
                >
                  <span className="flex cursor-help items-center space-x-1 rounded-sm bg-gray-800 px-2 font-bold">
                    <PulseIcon className="h-6 stroke-[1px]" />
                    <span className="text-xs">
                      {change.affectedOperations.length}{' '}
                      {change.affectedOperations.length === 1 ? 'operation' : 'operations'} affected
                    </span>
                  </span>
                </LegacyTooltip>
              </LegacyTooltip.Provider>
            ) : null}
            {change.affectedClients?.length ? (
              <LegacyTooltip.Provider delayDuration={0}>
                <LegacyTooltip
                  content={
                    <>
                      <div className="mb-2 text-lg font-bold">Client Usage</div>
                      <ul>
                        {change.affectedClients.map(clientName => (
                          <li key={clientName} className="font-bold">
                            <Link
                              className="text-orange-500 hover:text-orange-500 hover:underline hover:underline-offset-2"
                              href={{
                                pathname:
                                  '/[organizationId]/[projectId]/[targetId]/insights/client/[name]',
                                query: {
                                  organizationId: router.organizationId,
                                  projectId: router.projectId,
                                  targetId: router.targetId,
                                  name: clientName,
                                },
                              }}
                            >
                              {clientName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  }
                >
                  <span className="flex cursor-help items-center space-x-1 rounded-sm bg-gray-800 px-2 font-bold">
                    <UsersIcon className="h-4" />
                    <span className="text-xs">
                      {change.affectedClients.length}{' '}
                      {change.affectedClients.length === 1 ? 'client' : 'clients'} affected
                    </span>
                  </span>
                </LegacyTooltip>
              </LegacyTooltip.Provider>
            ) : null}
            {change.isSafeBasedOnUsage ? (
              <span className="cursor-pointer text-yellow-500">
                {' '}
                <CheckIcon className="inline h-3 w-3" /> Safe based on usage data
              </span>
            ) : null}
            {change.approval ? <SchemaChangeApproval approval={change.approval} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SchemaChangeApproval = (props: {
  approval: Exclude<SchemaChangeFieldsFragment['approval'], null | undefined>;
}) => {
  const approvalName = props.approval.approvedBy?.displayName ?? '<unknown>';
  const approvalDate = useMemo(
    () => format(new Date(props.approval.approvedAt), 'do MMMM yyyy'),
    [props.approval.approvedAt],
  );
  const route = useRouteSelector();
  // eslint-disable-next-line no-restricted-syntax
  const schemaCheckPath = useMemo(
    () =>
      '/' +
      [
        route.organizationId,
        route.projectId,
        route.targetId,
        'checks',
        props.approval.schemaCheckId,
      ].join('/'),
    [],
  );

  return (
    <LegacyTooltip.Provider delayDuration={200}>
      <LegacyTooltip
        content={
          <>
            This breaking change was manually{' '}
            {props.approval.schemaCheckId === route.schemaCheckId ? (
              <>
                {' '}
                approved by {approvalName} in this check on {approvalDate}.
              </>
            ) : (
              <Link href={schemaCheckPath} className="text-orange-500 hover:underline">
                approved by {approvalName} on {approvalDate}.
              </Link>
            )}
          </>
        }
      >
        <span className="cursor-pointer text-green-500">
          {' '}
          <CheckIcon className="inline h-3 w-3" /> Approved by {approvalName}
        </span>
      </LegacyTooltip>
    </LegacyTooltip.Provider>
  );
};

function MaybeWrapTooltip(props: { children: React.ReactNode; tooltip: string | null }) {
  return props.tooltip ? (
    <LegacyTooltip.Provider delayDuration={200}>
      <LegacyTooltip content={props.tooltip}>{props.children}</LegacyTooltip>
    </LegacyTooltip.Provider>
  ) : (
    <>{props.children}</>
  );
}

function ErrorsBlock({ title, errors }: { errors: string[]; title: React.ReactNode }) {
  if (!errors.length) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{title}</h2>
      <ul className="list-inside list-disc pl-3 text-sm leading-relaxed">
        {errors.map((error, key) => (
          <li key={key} className="my-1 text-red-400">
            <span className="text-gray-600 dark:text-white">{labelize(error)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VersionErrorsAndChanges(props: {
  changes: {
    nodes: SchemaChangeFieldsFragment[];
    total: number;
  };
  errors: {
    nodes: Array<{
      message: string;
    }>;
    total: number;
  };
}) {
  const generalErrors = props.errors.nodes
    .filter(err => err.message.startsWith('[') === false)
    .map(err => err.message);
  const groupedServiceErrors = new Map<string, string[]>();

  for (const err of props.errors.nodes) {
    if (err.message.startsWith('[')) {
      const [service, ...message] = err.message.split('] ');
      const serviceName = service.replace('[', '');
      const errorMessage = message.join('] ');

      if (!groupedServiceErrors.has(serviceName)) {
        groupedServiceErrors.set(serviceName, [errorMessage]);
      }

      groupedServiceErrors.get(serviceName)!.push(errorMessage);
    }
  }

  const serviceErrorEntries = Array.from(groupedServiceErrors.entries());

  const breakingChanges = props.changes.nodes.filter(
    c => c.criticality === CriticalityLevel.Breaking,
  );
  const dangerousChanges = props.changes.nodes.filter(
    c => c.criticality === CriticalityLevel.Dangerous,
  );
  const safeChanges = props.changes.nodes.filter(c => c.criticality === CriticalityLevel.Safe);

  return (
    <div className="p-5">
      <div>
        {props.changes.total ? (
          <div>
            <div className="font-semibold">Schema Changes</div>
            <div>
              <div className="space-y-3 p-6">
                {breakingChanges.length ? (
                  <ChangesBlock changes={breakingChanges} criticality={CriticalityLevel.Breaking} />
                ) : null}
                {dangerousChanges.length ? (
                  <ChangesBlock
                    changes={dangerousChanges}
                    criticality={CriticalityLevel.Dangerous}
                  />
                ) : null}
                {safeChanges.length ? (
                  <ChangesBlock changes={safeChanges} criticality={CriticalityLevel.Safe} />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {props.errors.total ? (
          <div>
            <div className="font-semibold">Composition errors</div>
            <div className="space-y-3 p-6">
              {generalErrors.length ? (
                <ErrorsBlock title="Top-level errors" errors={generalErrors} />
              ) : null}
              {serviceErrorEntries.length ? (
                <>
                  {serviceErrorEntries.map(([service, errors]) => (
                    <ErrorsBlock
                      key={service}
                      title={
                        <>
                          Errors from the <strong>"{service}"</strong> service
                        </>
                      }
                      errors={errors}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
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
                <InfoCircledIcon className="h-3 w-3" />
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
