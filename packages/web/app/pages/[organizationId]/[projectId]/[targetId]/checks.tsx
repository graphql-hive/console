import { useCallback, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { format } from 'date-fns';
import { BadgeCheck, ChevronDown, GitCompareIcon, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { authenticated } from '@/components/authenticated-container';
import { Page, TargetLayout } from '@/components/layouts/target';
import { SchemaEditor } from '@/components/schema-editor';
import {
  ChangesBlock,
  CompositionErrorsSection,
  labelize,
  NoGraphChanges,
} from '@/components/target/history/errors-and-changes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Subtitle, Title } from '@/components/ui/page';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QueryError } from '@/components/ui/query-error';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Badge,
  DiffEditor,
  DocsLink,
  EmptyList,
  Heading,
  Button as LegacyButton,
  MetaTitle,
  Spinner,
  TimeAgo,
} from '@/components/v2';
import { AlertTriangleIcon, DiffIcon } from '@/components/v2/icon';
import { FragmentType, graphql, useFragment } from '@/gql';
import { CriticalityLevel, ProjectType } from '@/gql/graphql';
import { useRouteSelector } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  ListBulletIcon,
} from '@radix-ui/react-icons';
import { ScrollArea } from '@/components/ui/scroll-area';

const SchemaChecks_NavigationQuery = graphql(`
  query SchemaChecks_NavigationQuery(
    $organizationId: ID!
    $projectId: ID!
    $targetId: ID!
    $after: String
    $filters: SchemaChecksFilter
  ) {
    target(selector: { organization: $organizationId, project: $projectId, target: $targetId }) {
      id
      schemaChecks(first: 20, after: $after, filters: $filters) {
        edges {
          node {
            __typename
            id
            createdAt
            serviceName
            meta {
              commit
              author
            }
            breakingSchemaChanges {
              total
            }
            safeSchemaChanges {
              total
            }
            githubRepository
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }
  }
`);

interface SchemaCheckFilters {
  showOnlyFailed?: boolean;
  showOnlyChanged?: boolean;
}

const Navigation = (props: {
  after: string | null;
  isLastPage: boolean;
  onLoadMore: (cursor: string) => void;
  filters?: SchemaCheckFilters;
}) => {
  const router = useRouteSelector();
  const [query] = useQuery({
    query: SchemaChecks_NavigationQuery,
    variables: {
      organizationId: router.organizationId,
      projectId: router.projectId,
      targetId: router.targetId,
      after: props.after,
      filters: {
        changed: props.filters?.showOnlyChanged ?? false,
        failed: props.filters?.showOnlyFailed ?? false,
      },
    },
  });

  return (
    <>
      {query.fetching || !query.data?.target?.schemaChecks ? null : (
        <>
          {query.data.target.schemaChecks.edges.map(edge => (
            <div
              key={edge.node.id}
              className={cn(
                'flex flex-col rounded-md p-2.5 hover:bg-gray-800/40',
                edge.node.id === router.schemaCheckId ? 'bg-gray-800/40' : null,
              )}
            >
              <NextLink
                key={edge.node.id}
                href={{
                  pathname: '/[organizationId]/[projectId]/[targetId]/checks/[schemaCheckId]',
                  query: {
                    organizationId: router.organizationId,
                    projectId: router.projectId,
                    targetId: router.targetId,
                    schemaCheckId: edge.node.id,
                    filter_changed: props.filters?.showOnlyChanged,
                    filter_failed: props.filters?.showOnlyFailed,
                  },
                }}
                scroll={false} // disable the scroll to top on page
              >
                <h3 className="truncate text-sm font-semibold">
                  {edge.node.meta?.commit ?? edge.node.id}
                </h3>
                {edge.node.meta?.author ? (
                  <div className="truncate text-xs font-medium text-gray-500">
                    <span className="overflow-hidden truncate">{edge.node.meta.author}</span>
                  </div>
                ) : null}
                <div className="mb-1.5 mt-2.5 flex align-middle text-xs font-medium text-[#c4c4c4]">
                  <div
                    className={cn(
                      edge.node.__typename === 'FailedSchemaCheck' ? 'text-red-500' : null,
                    )}
                  >
                    <Badge color={edge.node.__typename === 'FailedSchemaCheck' ? 'red' : 'green'} />{' '}
                    <TimeAgo date={edge.node.createdAt} />
                  </div>

                  {edge.node.serviceName ? (
                    <div className="ml-auto mr-0 w-1/2 truncate text-right font-bold">
                      {edge.node.serviceName}
                    </div>
                  ) : null}
                </div>
              </NextLink>
              {edge.node.githubRepository && edge.node.meta ? (
                <a
                  className="-ml-px text-xs font-medium text-gray-500 hover:text-gray-400"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://github.com/${edge.node.githubRepository}/commit/${edge.node.meta.commit}`}
                >
                  <ExternalLinkIcon className="inline" /> associated with Git commit
                </a>
              ) : null}
            </div>
          ))}
          {props.isLastPage && query.data.target.schemaChecks.pageInfo.hasNextPage && (
            <LegacyButton
              variant="link"
              onClick={() => {
                props.onLoadMore(query.data?.target?.schemaChecks.pageInfo.endCursor ?? '');
              }}
            >
              Load more
            </LegacyButton>
          )}
        </>
      )}
    </>
  );
};

const ActiveSchemaCheck_SchemaCheckFragment = graphql(`
  fragment ActiveSchemaCheck_SchemaCheckFragment on SchemaCheck {
    __typename
    id
    serviceName
    contextId
    createdAt
    meta {
      commit
      author
    }
    ... on FailedSchemaCheck {
      canBeApproved
      canBeApprovedByViewer
    }
    ... on SuccessfulSchemaCheck {
      isApproved
      approvedBy {
        id
        displayName
        email
      }
      approvalComment
    }
    contractChecks {
      __typename
      edges {
        node {
          id
          isSuccess
        }
      }
    }
    ...SchemaCheckView_SchemaCheckFragment
  }
`);

const ActiveSchemaCheckQuery = graphql(`
  query ActiveSchemaCheck_ActiveSchemaCheckQuery(
    $organizationId: ID!
    $projectId: ID!
    $targetId: ID!
    $schemaCheckId: ID!
  ) {
    target(selector: { organization: $organizationId, project: $projectId, target: $targetId }) {
      id
      schemaCheck(id: $schemaCheckId) {
        ...ActiveSchemaCheck_SchemaCheckFragment
      }
    }
    project(selector: { organization: $organizationId, project: $projectId }) {
      id
      type
    }
  }
`);

const PolicyBlock = (props: {
  title: string;
  policies: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment>;
  type: 'warning' | 'error';
}) => {
  const policies = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.policies);
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{props.title}</h2>
      <ul className="list-inside list-disc pl-3 text-sm leading-relaxed">
        {policies.edges.map((edge, key) => (
          <li
            key={key}
            className={cn(props.type === 'warning' ? 'text-yellow-400' : 'text-red-400', ' my-1')}
          >
            <span className="text-gray-600 dark:text-white">{labelize(edge.node.message)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ApproveFailedSchemaCheckMutation = graphql(`
  mutation ApproveFailedSchemaCheckModal_ApproveFailedSchemaCheckMutation(
    $input: ApproveFailedSchemaCheckInput!
  ) {
    approveFailedSchemaCheck(input: $input) {
      ok {
        schemaCheck {
          ...ActiveSchemaCheck_SchemaCheckFragment
        }
      }
      error {
        message
      }
    }
  }
`);

function ApproveFailedSchemaCheckModal(props: {
  organizationId: string;
  projectId: string;
  targetId: string;
  schemaCheckId: string;
  contextId: string | null | undefined;
  onClose(): void;
}) {
  const [mutation, approve] = useMutation(ApproveFailedSchemaCheckMutation);
  const [approvalComment, setApprovalComment] = useState<string>('');
  const onApprovalCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setApprovalComment(e.target.value);
    },
    [setApprovalComment],
  );

  if (mutation.error) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Oops. Something unexpected happened</h4>
        <p className="text-muted-foreground text-sm">{mutation.error.message}</p>
        <div className="text-right">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    );
  }

  if (mutation.data?.approveFailedSchemaCheck.error) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Approval failed</h4>
        <p className="text-muted-foreground text-sm">
          {mutation.data.approveFailedSchemaCheck.error.message}
        </p>
        <div className="text-right">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    );
  }

  if (mutation.data?.approveFailedSchemaCheck.ok) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium leading-none">
          The schema check has been approved successfully!
        </h4>
        <div className="text-right">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium leading-none">Finish your approval</h4>
      <div>
        <p className="text-muted-foreground text-sm">Acknowledge and accept breaking changes.</p>
        {props?.contextId ? (
          <p className="text-muted-foreground text-sm">
            Approval applies to all future changes within the context of a pull request or branch
            lifecycle: <span className="font-medium">{props?.contextId}</span>
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Textarea
          value={approvalComment}
          onChange={onApprovalCommentChange}
          className="w-full"
          placeholder="Leave a comment"
        />
        <div className="text-right">
          {mutation.fetching ? (
            <Button disabled>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Please wait
            </Button>
          ) : (
            <Button
              onClick={() =>
                approve({
                  input: {
                    organization: props.organizationId,
                    project: props.projectId,
                    target: props.targetId,
                    schemaCheckId: props.schemaCheckId,
                    comment: approvalComment,
                  },
                })
              }
            >
              Submit approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const BreakingChangesTitle = () => {
  return (
    <TooltipProvider>
      Breaking Changes
      <Tooltip>
        <TooltipTrigger>
          <Button variant="ghost" size="icon-sm" className="ml-1">
            <InfoCircledIcon className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent align="start">
          <div className="mb-2 max-w-[500px] font-normal">
            <h5 className="mb-1 text-lg font-bold">Breaking Changes</h5>
            <p className="mb-2 text-sm">Schema changes that can potentially break clients.</p>
            <h6 className="mb-1 font-bold">Breaking Change Approval</h6>
            <p className="mb-2">
              Approve this schema check for adding the changes to the list of allowed changes and
              change the status of this schema check to successful.
            </p>
            <h6 className="mb-1 font-bold">Conditional Breaking Changes</h6>
            <p>
              Configure conditional breaking changes, to automatically mark breaking changes as safe
              based on live usage data collected from your GraphQL Gateway.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ActiveSchemaCheck = ({
  schemaCheckId,
}: {
  schemaCheckId: string | null;
}): React.ReactElement | null => {
  const router = useRouteSelector();
  const [query] = useQuery({
    query: ActiveSchemaCheckQuery,
    variables: {
      organizationId: router.organizationId,
      projectId: router.projectId,
      targetId: router.targetId,
      schemaCheckId: schemaCheckId ?? '',
    },
    pause: !schemaCheckId,
  });
  const [approvalOpen, setApprovalOpen] = useState(false);

  const schemaCheck = useFragment(
    ActiveSchemaCheck_SchemaCheckFragment,
    query.data?.target?.schemaCheck,
  );

  if (!schemaCheckId) {
    return null;
  }

  if (query.fetching) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center self-center">
        <div className="flex flex-col items-center">
          <Spinner className="size-12" />
          <div className="mt-3">Loading Schema Check...</div>
        </div>
      </div>
    );
  }

  if (!schemaCheck || !query.data?.project) {
    return (
      <EmptyList
        className="border-0"
        title="Check not found"
        description="Learn how to check your schema with Hive CLI"
        docsUrl="/features/schema-registry#check-a-schema"
      />
    );
  }

  return (
    <div className="flex h-full grow flex-col">
      <div className="py-6">
        <Title>Check {schemaCheck.id}</Title>
        <Subtitle>Detailed view of the schema check</Subtitle>
      </div>
      <div>
        <div className="flex flex-row items-center justify-between gap-x-4 rounded-md border border-gray-800 p-4 font-medium text-gray-400">
          <div>
            <div className="text-xs">Status</div>
            <div className="text-sm font-semibold text-white">
              {schemaCheck.__typename === 'FailedSchemaCheck' ? <>Failed</> : <>Success</>}
            </div>
          </div>
          {schemaCheck.serviceName ? (
            <div className="ml-4">
              <div className="text-xs">Service</div>
              <div>
                <div className="text-sm font-semibold text-white">{schemaCheck.serviceName}</div>
              </div>
            </div>
          ) : null}
          <div>
            <div className="text-xs">
              Triggered <TimeAgo date={schemaCheck.createdAt} />
            </div>
            <div className="truncate text-sm text-white">
              by {schemaCheck.meta ? <>{schemaCheck.meta.author}</> : 'unknown'}
            </div>
          </div>
          <div>
            <div className="text-xs">Commit</div>
            <div>
              <div className="truncate text-sm font-semibold text-white">
                {schemaCheck.meta?.commit ?? 'unknown'}
              </div>
            </div>
          </div>
          {schemaCheck.__typename === 'FailedSchemaCheck' && schemaCheck.canBeApproved ? (
            <div className="ml-auto mr-0 pl-4">
              {schemaCheck.canBeApprovedByViewer ? (
                <Popover open={approvalOpen} onOpenChange={setApprovalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="destructive">
                      Approve <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px]">
                    <PopoverArrow />
                    <ApproveFailedSchemaCheckModal
                      onClose={() => setApprovalOpen(false)}
                      organizationId={router.organizationId}
                      projectId={router.projectId}
                      targetId={router.targetId}
                      schemaCheckId={schemaCheck.id}
                      contextId={schemaCheck.contextId}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          ) : null}
        </div>
        {schemaCheck.__typename === 'SuccessfulSchemaCheck' && schemaCheck.isApproved ? (
          <div className="py-6">
            <div className="flex flex-row items-center gap-x-6 rounded-md border border-gray-900 p-4 font-medium text-gray-400">
              <div>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BadgeCheck className="size-6 text-green-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Schema Check was manually approved by{' '}
                      {schemaCheck.approvedBy?.displayName ?? 'unknown'}.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                <p className="text-sm font-medium leading-none">
                  {schemaCheck.approvedBy?.displayName ?? 'unknown'}
                </p>
                <p className="text-muted-foreground text-sm">
                  {schemaCheck.approvedBy?.email ?? 'unknown'}
                </p>
              </div>
              {schemaCheck.approvalComment ? (
                <div className="text-sm italic text-white">
                  <span>„ </span>
                  {schemaCheck.approvalComment}
                  <span> ”</span>
                </div>
              ) : (
                <div className="text-sm italic">
                  manually approved this schema check without a comment
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <SchemaChecksView schemaCheck={schemaCheck} projectType={query.data.project.type} />
    </div>
  );
};

const SchemaPolicyEditor_PolicyWarningsFragment = graphql(`
  fragment SchemaPolicyEditor_PolicyWarningsFragment on SchemaPolicyWarningConnection {
    edges {
      node {
        message
        start {
          line
          column
        }
        end {
          line
          column
        }
      }
    }
  }
`);

function withLineAndColumn<T>(
  marker: T,
): marker is T & { start: { line: number; column: number } } {
  return typeof (marker as any)?.start?.line === 'number';
}

const SchemaPolicyEditor = (props: {
  compositeSchemaSDL: string;
  warnings: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment> | null;
  errors: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment> | null;
}) => {
  const warnings = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.warnings);
  const errors = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.errors);
  return (
    <SchemaEditor
      theme="vs-dark"
      options={{
        renderLineHighlightOnlyWhenFocus: true,
        readOnly: true,
        lineNumbers: 'off',
        renderValidationDecorations: 'on',
      }}
      onMount={(_, monaco) => {
        monaco.editor.setModelMarkers(monaco.editor.getModels()[0], 'owner', [
          ...(warnings?.edges
            .map(edge => edge.node)
            .filter(withLineAndColumn)
            .map(node => ({
              message: node.message,
              startLineNumber: node.start.line,
              startColumn: node.start.column,
              endLineNumber: node.end?.line ?? node.start.line,
              endColumn: node.end?.column ?? node.start.column,
              severity: monaco.MarkerSeverity.Warning,
            })) ?? []),
          ...(errors?.edges
            .map(edge => edge.node)
            .filter(withLineAndColumn)
            .map(node => ({
              message: node.message,
              startLineNumber: node.start.line,
              startColumn: node.start.column,
              endLineNumber: node.end?.line ?? node.start.line,
              endColumn: node.end?.column ?? node.start.column,
              severity: monaco.MarkerSeverity.Error,
            })) ?? []),
        ]);
      }}
      schema={props.compositeSchemaSDL}
    />
  );
};

const SchemaChecksView_SchemaCheckFragment = graphql(`
  fragment SchemaCheckView_SchemaCheckFragment on SchemaCheck {
    id
    hasSchemaCompositionErrors
    hasSchemaChanges
    hasUnapprovedBreakingChanges
    contractChecks {
      edges {
        node {
          id
          contractName
          hasSchemaCompositionErrors
          hasUnapprovedBreakingChanges
          hasSchemaChanges
          ...ContractCheckView_ContractCheckFragment
        }
      }
    }
    ...DefaultSchemaView_SchemaCheckFragment
    ...ContractCheckView_SchemaCheckFragment
  }
`);

function SchemaChecksView(props: {
  schemaCheck: FragmentType<typeof SchemaChecksView_SchemaCheckFragment>;
  projectType: ProjectType;
}) {
  const schemaCheck = useFragment(SchemaChecksView_SchemaCheckFragment, props.schemaCheck);

  const [selectedItem, setSelectedItem] = useState<string>('default');
  const selectedContractCheckNode = useMemo(
    () =>
      schemaCheck.contractChecks?.edges?.find(edge => edge.node.id === selectedItem)?.node ?? null,
    [selectedItem],
  );

  return (
    <>
      <Tabs
        defaultValue="default"
        className="mt-3"
        value={selectedItem}
        onValueChange={value => setSelectedItem(value)}
      >
        <TabsList className="w-full justify-start rounded-b-none px-2 py-0">
          <TabsTrigger value="default" className="mt-1 py-2 data-[state=active]:rounded-b-none">
            <span>Default Graph</span>
            <TooltipProvider>
              <Tooltip>
                {schemaCheck.hasSchemaCompositionErrors ? (
                  <>
                    <TooltipTrigger>
                      <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>Composition failed.</TooltipContent>
                  </>
                ) : schemaCheck.hasUnapprovedBreakingChanges ? (
                  <>
                    <TooltipTrigger>
                      <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>Unapproved breaking changes!</TooltipContent>
                  </>
                ) : schemaCheck.hasSchemaChanges ? (
                  <>
                    <TooltipTrigger>
                      <GitCompareIcon className="size-4 pl-1" />
                    </TooltipTrigger>
                    <TooltipContent>Schema changed</TooltipContent>
                  </>
                ) : (
                  <>
                    <TooltipTrigger>
                      <CheckIcon className="size-4 pl-1" />
                    </TooltipTrigger>
                    <TooltipContent>Composition succeeded.</TooltipContent>
                  </>
                )}
              </Tooltip>
            </TooltipProvider>
          </TabsTrigger>
          {schemaCheck.contractChecks?.edges.map(edge => (
            <TabsTrigger
              value={edge.node.id}
              key={edge.node.id}
              className="mt-1 py-2 data-[state=active]:rounded-b-none"
            >
              {edge.node.contractName}
              <TooltipProvider>
                <Tooltip>
                  {edge.node.hasSchemaCompositionErrors ? (
                    <>
                      <TooltipTrigger>
                        <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>Composition failed.</TooltipContent>
                    </>
                  ) : edge.node.hasUnapprovedBreakingChanges ? (
                    <>
                      <TooltipTrigger>
                        <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>Unapproved breaking changes!</TooltipContent>
                    </>
                  ) : edge.node.hasSchemaChanges ? (
                    <>
                      <TooltipTrigger>
                        <GitCompareIcon className="size-4 pl-1" />
                      </TooltipTrigger>
                      <TooltipContent>Contract schema changed</TooltipContent>
                    </>
                  ) : (
                    <>
                      <TooltipTrigger>
                        <CheckIcon className="size-4 pl-1" />
                      </TooltipTrigger>
                      <TooltipContent>Composition succeeded.</TooltipContent>
                    </>
                  )}
                </Tooltip>
              </TooltipProvider>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {selectedContractCheckNode ? (
        <ContractCheckView
          contractCheck={selectedContractCheckNode}
          schemaCheck={schemaCheck}
          projectType={props.projectType}
        />
      ) : (
        <DefaultSchemaView schemaCheck={schemaCheck} projectType={props.projectType} />
      )}
    </>
  );
}

const DefaultSchemaView_SchemaCheckFragment = graphql(`
  fragment DefaultSchemaView_SchemaCheckFragment on SchemaCheck {
    id
    schemaSDL
    previousSchemaSDL
    serviceName
    hasSchemaCompositionErrors
    schemaVersion {
      id
      supergraph
      sdl
    }
    ... on SuccessfulSchemaCheck {
      compositeSchemaSDL
      supergraphSDL
    }
    ... on FailedSchemaCheck {
      compositeSchemaSDL
      supergraphSDL
      compositionErrors {
        ...CompositionErrorsSection_SchemaErrorConnection
      }
    }
    breakingSchemaChanges {
      nodes {
        ...ChangesBlock_SchemaChangeWithUsageFragment
      }
    }
    safeSchemaChanges {
      nodes {
        ...ChangesBlock_SchemaChangeFragment
      }
    }
    schemaPolicyWarnings {
      ...SchemaPolicyEditor_PolicyWarningsFragment
      edges {
        node {
          message
        }
      }
    }
    schemaPolicyErrors {
      ...SchemaPolicyEditor_PolicyWarningsFragment
      edges {
        node {
          message
        }
      }
    }
    contractChecks {
      edges {
        node {
          id
          isSuccess
        }
      }
    }
    conditionalBreakingChangeMetadata {
      ...ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    }
    ...ConditionalBreakingChangesMetadataSection_SchemaCheckFragment
  }
`);

function DefaultSchemaView(props: {
  schemaCheck: FragmentType<typeof DefaultSchemaView_SchemaCheckFragment>;
  projectType: ProjectType;
}) {
  const schemaCheck = useFragment(DefaultSchemaView_SchemaCheckFragment, props.schemaCheck);
  const [selectedView, setSelectedView] = useState<string>('details');

  const items = [
    {
      value: 'details',
      icon: <ListBulletIcon className="h-5 w-auto flex-none" />,
      label: 'Details',
      tooltip: 'Details',
      isDisabled: false,
    },
  ];

  if (schemaCheck.serviceName) {
    items.push({
      value: 'service',
      icon: <DiffIcon className="h-5 w-auto flex-none" />,
      label: 'Service',
      tooltip: 'Service',
      isDisabled: false,
    });
  }

  items.push({
    value: 'schema',
    icon: <DiffIcon className="h-5 w-auto flex-none" />,
    label: 'Schema',
    tooltip: 'Schema Diff',
    isDisabled: !schemaCheck.compositeSchemaSDL,
  });

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      icon: <DiffIcon className="h-5 w-auto flex-none" />,
      label: 'Supergraph',
      tooltip: 'Supergraph',
      isDisabled: !schemaCheck.supergraphSDL,
    });
  }

  items.push({
    value: 'policy',
    icon: <AlertTriangleIcon className="h-5 w-auto flex-none" />,
    label: 'Policy',
    tooltip: 'Schema Policy',
    isDisabled:
      !schemaCheck.schemaPolicyWarnings &&
      !(
        schemaCheck.__typename === 'FailedSchemaCheck' &&
        schemaCheck.schemaPolicyErrors?.edges?.length
      ),
  });

  return (
    <>
      <Tabs value={selectedView} onValueChange={value => setSelectedView(value)}>
        <TabsList className="bg-background border-muted w-full justify-start rounded-none border-x border-b">
          {items.map(item => (
            <TabsTrigger key={item.value} value={item.value} disabled={item.isDisabled}>
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="border-muted min-h-[850px] rounded-md rounded-t-none border border-t-0">
        {selectedView === 'details' && (
          <div className="my-4 px-4">
            {!schemaCheck.schemaPolicyWarnings?.edges?.length &&
              !schemaCheck.safeSchemaChanges?.nodes?.length &&
              !schemaCheck.breakingSchemaChanges?.nodes?.length &&
              !schemaCheck.schemaPolicyErrors?.edges?.length &&
              !schemaCheck.hasSchemaCompositionErrors && <NoGraphChanges />}
            {schemaCheck.__typename === 'FailedSchemaCheck' && schemaCheck.compositionErrors && (
              <CompositionErrorsSection compositionErrors={schemaCheck.compositionErrors} />
            )}
            {schemaCheck.breakingSchemaChanges?.nodes.length ? (
              <div className="mb-5">
                <ChangesBlock
                  title={<BreakingChangesTitle />}
                  criticality={CriticalityLevel.Breaking}
                  changesWithUsage={schemaCheck.breakingSchemaChanges.nodes}
                  conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
                />
              </div>
            ) : null}
            {schemaCheck.safeSchemaChanges ? (
              <div className="mb-5">
                <ChangesBlock
                  title="Safe Changes"
                  criticality={CriticalityLevel.Safe}
                  changes={schemaCheck.safeSchemaChanges.nodes}
                />
              </div>
            ) : null}
            {schemaCheck.schemaPolicyErrors?.edges.length ? (
              <div className="mb-5">
                <PolicyBlock
                  title="Schema Policy Errors"
                  policies={schemaCheck.schemaPolicyErrors}
                  type="error"
                />
              </div>
            ) : null}
            {schemaCheck.schemaPolicyWarnings ? (
              <div className="mb-5">
                <PolicyBlock
                  title="Schema Policy Warnings"
                  policies={schemaCheck.schemaPolicyWarnings}
                  type="warning"
                />
              </div>
            ) : null}
            <ConditionalBreakingChangesMetadataSection schemaCheck={schemaCheck} />
          </div>
        )}
        {selectedView === 'service' && (
          <DiffEditor
            before={schemaCheck.previousSchemaSDL ?? null}
            after={schemaCheck.schemaSDL}
            downloadFileName="service.graphqls"
          />
        )}
        {selectedView === 'schema' && (
          <DiffEditor
            before={schemaCheck.schemaVersion?.sdl ?? null}
            after={schemaCheck.compositeSchemaSDL ?? null}
            downloadFileName="schema.graphqls"
          />
        )}
        {selectedView === 'supergraph' && (
          <DiffEditor
            before={schemaCheck?.schemaVersion?.supergraph ?? null}
            after={schemaCheck?.supergraphSDL ?? null}
            downloadFileName="supergraph.graphqls"
          />
        )}
        {selectedView === 'policy' && (
          <>
            <div className="my-2 px-2">
              <Heading>Schema Policy</Heading>
            </div>
            <SchemaPolicyEditor
              compositeSchemaSDL={schemaCheck.schemaSDL ?? ''}
              warnings={schemaCheck.schemaPolicyWarnings ?? null}
              errors={
                ('schemaPolicyErrors' in schemaCheck && schemaCheck.schemaPolicyErrors) || null
              }
            />
          </>
        )}
      </div>
    </>
  );
}

const ConditionalBreakingChangesMetadataSection_SchemaCheckFragment = graphql(`
  fragment ConditionalBreakingChangesMetadataSection_SchemaCheckFragment on SchemaCheck {
    id
    conditionalBreakingChangeMetadata {
      period {
        from
        to
      }
      settings {
        retentionInDays
        percentage
        excludedClientNames
        targets {
          name
          target {
            id
          }
        }
      }
      usage {
        totalRequestCountFormatted
      }
    }
  }
`);

function ConditionalBreakingChangesMetadataSection(props: {
  schemaCheck: FragmentType<typeof ConditionalBreakingChangesMetadataSection_SchemaCheckFragment>;
}) {
  const schemaCheck = useFragment(
    ConditionalBreakingChangesMetadataSection_SchemaCheckFragment,
    props.schemaCheck,
  );


  if (!schemaCheck.conditionalBreakingChangeMetadata) {
    return (
      <div className="mb-5 mt-10 text-sm text-gray-400">
        Get more out of schema checks by enabling conditional breaking changes based on usage data.
        <br />
        <DocsLink
          href="/management/targets#conditional-breaking-changes"
          className="text-gray-500 hover:text-gray-300"
        >
          Learn more about conditional breaking changes.
        </DocsLink>
      </div>
    )
  }

  const numberOfTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.length;
  const truncatedTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.slice(0, 3);
  const excludedTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.slice(3);
  const allTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets;



  return (
    <div className="mb-5 mt-10 text-sm text-gray-400">
      <p>
        Based on{' '}
        <span className="text-white">
          {schemaCheck.conditionalBreakingChangeMetadata.usage.totalRequestCountFormatted}{' '}
          requests
        </span>{' '}
        from target
        {numberOfTargets === 1
          ? ''
          : 's'}{' '}
        {numberOfTargets <= 3 && (
          <>
            {allTargets.map((target, index) => (
              <>
                <span className="text-white">{target.name}</span>
                {index === allTargets.length - 1 ? null : ', '}
              </>
            ))}
          </>
        )}
        {numberOfTargets > 3 && (
          <>
            {truncatedTargets.map((target, index) => (
              <>
                <span className="text-white">{target.name}</span>
                {index === truncatedTargets.length - 1 ? null : ', '}
              </>
            ))}
            {' and '}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='link' className='p-0'>{excludedTargets.length} more</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="p-2">
                  <h4 className="text-sm font-semibold text-white mb-2">All Targets</h4>
                  <ScrollArea className="h-44 w-full">
                    <div className="grid grid-cols-1 divide-y divide-gray-800">
                      {allTargets.map((target, index) => (
                        <div key={index} className="py-2">
                          <div className="line-clamp-3 text-sm text-gray-400">{target.name}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}{' '}
        . <br />
        Usage data ranges from{' '}
        <span className="text-white">
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.from, 'do MMM yyyy HH:mm')}
        </span>{' '}
        to{' '}
        <span className="text-white">
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.to, 'do MMM yyyy HH:mm')} (
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.to, 'z')})
        </span>{' '}
        (period of {schemaCheck.conditionalBreakingChangeMetadata.settings.retentionInDays} day
        {schemaCheck.conditionalBreakingChangeMetadata.settings.retentionInDays === 1 ? '' : 's'}
        ).
        <br />
        <DocsLink
          href="/management/targets#conditional-breaking-changes"
          className="text-gray-500 hover:text-gray-300"
        >
          Learn more about conditional breaking changes.
        </DocsLink>
      </p>
    </div >
  );
}

const ContractCheckView_ContractCheckFragment = graphql(`
  fragment ContractCheckView_ContractCheckFragment on ContractCheck {
    id
    schemaCompositionErrors {
      ...CompositionErrorsSection_SchemaErrorConnection
    }
    breakingSchemaChanges {
      nodes {
        ...ChangesBlock_SchemaChangeWithUsageFragment
      }
    }
    safeSchemaChanges {
      nodes {
        ...ChangesBlock_SchemaChangeFragment
      }
    }
    compositeSchemaSDL
    supergraphSDL
    contractVersion {
      id
      compositeSchemaSDL
      supergraphSDL
    }
  }
`);

const ContractCheckView_SchemaCheckFragment = graphql(`
  fragment ContractCheckView_SchemaCheckFragment on SchemaCheck {
    id
    ...ConditionalBreakingChangesMetadataSection_SchemaCheckFragment
    conditionalBreakingChangeMetadata {
      ...ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    }
  }
`);

function ContractCheckView(props: {
  contractCheck: FragmentType<typeof ContractCheckView_ContractCheckFragment>;
  schemaCheck: FragmentType<typeof ContractCheckView_SchemaCheckFragment>;
  projectType: ProjectType;
}) {
  const contractCheck = useFragment(ContractCheckView_ContractCheckFragment, props.contractCheck);
  const schemaCheck = useFragment(ContractCheckView_SchemaCheckFragment, props.schemaCheck);

  const [selectedView, setSelectedView] = useState<string>('details');

  const items = [
    {
      value: 'details',
      icon: <ListBulletIcon className="h-5 w-auto flex-none" />,
      label: 'Details',
      tooltip: 'Details',
      disabledReason: false,
    },
    {
      value: 'schema',
      icon: <DiffIcon className="h-5 w-auto flex-none" />,
      label: 'Schema',
      tooltip: 'Schema',
      disabledReason: !contractCheck.compositeSchemaSDL && (
        <>Composition did not succeed. No public schema SDL available.</>
      ),
    },
  ];

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      icon: <DiffIcon className="h-5 w-auto flex-none" />,
      label: 'Supergraph',
      tooltip: 'Supergraph',
      disabledReason: !contractCheck.supergraphSDL && (
        <>Composition did not succeed. No Supergraph available.</>
      ),
    });
  }

  return (
    <TooltipProvider>
      <Tabs value={selectedView} onValueChange={value => setSelectedView(value)}>
        <TabsList className="bg-background border-muted w-full justify-start rounded-none border-x border-b">
          {items.map(item => (
            <Tooltip>
              <TooltipTrigger>
                <TabsTrigger value={item.value} disabled={!!item.disabledReason}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </TabsTrigger>
              </TooltipTrigger>
              {item.disabledReason && (
                <TooltipContent className="max-w-md p-4 font-normal">
                  {item.disabledReason}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>
      <div className="border-muted min-h-[850px] rounded-md rounded-t-none border border-t-0">
        {selectedView === 'details' && (
          <div className="my-4 px-4">
            {contractCheck.schemaCompositionErrors && (
              <CompositionErrorsSection compositionErrors={contractCheck.schemaCompositionErrors} />
            )}
            {contractCheck.breakingSchemaChanges?.nodes.length && (
              <div className="mb-2">
                <ChangesBlock
                  title={<BreakingChangesTitle />}
                  criticality={CriticalityLevel.Breaking}
                  changesWithUsage={contractCheck.breakingSchemaChanges.nodes}
                  conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
                />
              </div>
            )}
            {contractCheck.safeSchemaChanges && (
              <div className="mb-2">
                <ChangesBlock
                  title="Safe Changes"
                  criticality={CriticalityLevel.Safe}
                  changes={contractCheck.safeSchemaChanges.nodes}
                />
              </div>
            )}
            {!contractCheck.breakingSchemaChanges &&
              !contractCheck.safeSchemaChanges &&
              !contractCheck.schemaCompositionErrors ? (
              <NoGraphChanges />
            ) : (
              <ConditionalBreakingChangesMetadataSection schemaCheck={schemaCheck} />
            )}
          </div>
        )}
        {selectedView === 'schema' && (
          <DiffEditor
            before={contractCheck?.contractVersion?.compositeSchemaSDL ?? null}
            after={contractCheck.compositeSchemaSDL ?? null}
            downloadFileName="schema.graphqls"
          />
        )}
        {selectedView === 'supergraph' && (
          <DiffEditor
            before={contractCheck?.contractVersion?.supergraphSDL ?? null}
            after={contractCheck?.supergraphSDL ?? null}
            downloadFileName="supergraph.graphqls"
          />
        )}
      </div>
    </TooltipProvider>
  );
}

const ChecksPageQuery = graphql(`
  query ChecksPageQuery(
    $organizationId: ID!
    $projectId: ID!
    $targetId: ID!
    $filters: SchemaChecksFilter
  ) {
    organizations {
      ...TargetLayout_OrganizationConnectionFragment
    }
    organization(selector: { organization: $organizationId }) {
      organization {
        ...TargetLayout_CurrentOrganizationFragment
        rateLimit {
          retentionInDays
        }
      }
    }
    project(selector: { organization: $organizationId, project: $projectId }) {
      ...TargetLayout_CurrentProjectFragment
    }
    target(selector: { organization: $organizationId, project: $projectId, target: $targetId }) {
      id
      schemaChecks(first: 1) {
        edges {
          node {
            id
          }
        }
      }
      filteredSchemaChecks: schemaChecks(first: 1, filters: $filters) {
        edges {
          node {
            id
          }
        }
      }
    }
    me {
      ...TargetLayout_MeFragment
    }
    ...TargetLayout_IsCDNEnabledFragment
  }
`);

function ChecksPageContent() {
  const [paginationVariables, setPaginationVariables] = useState<Array<string | null>>(() => [
    null,
  ]);

  const router = useRouteSelector();

  const showOnlyChanged = router.query.filter_changed === 'true';
  const showOnlyFailed = router.query.filter_failed === 'true';

  const [filters, setFilters] = useState<SchemaCheckFilters>({
    showOnlyChanged: showOnlyChanged ?? false,
    showOnlyFailed: showOnlyFailed ?? false,
  });

  const [query] = useQuery({
    query: ChecksPageQuery,
    variables: {
      organizationId: router.organizationId,
      projectId: router.projectId,
      targetId: router.targetId,
      filters: {
        changed: filters.showOnlyChanged ?? false,
        failed: filters.showOnlyFailed ?? false,
      },
    },
  });

  if (query.error) {
    return <QueryError error={query.error} />;
  }

  const me = query.data?.me;
  const currentOrganization = query.data?.organization?.organization;
  const currentProject = query.data?.project;
  const organizationConnection = query.data?.organizations;
  const isCDNEnabled = query.data;
  const { schemaCheckId } = router;
  const hasSchemaChecks = !!query.data?.target?.schemaChecks?.edges?.length;
  const hasFilteredSchemaChecks = !!query.data?.target?.filteredSchemaChecks?.edges?.length;
  const hasActiveSchemaCheck = !!schemaCheckId;

  const handleShowOnlyFilterChange = () => {
    const updatedFilters = !filters.showOnlyChanged;

    void router.push({
      query: {
        ...router.query,
        filter_changed: updatedFilters,
      },
    });
    setFilters(filters => ({
      ...filters,
      showOnlyChanged: !filters.showOnlyChanged,
    }));
  };

  const handleShowOnlyFilterFailed = () => {
    const updatedFilters = !filters.showOnlyFailed;

    void router.push({
      query: {
        ...router.query,
        filter_failed: updatedFilters,
      },
    });

    setFilters(filters => ({
      ...filters,
      showOnlyFailed: !filters.showOnlyFailed,
    }));
  };

  return (
    <>
      <TargetLayout
        page={Page.Checks}
        className="h-full"
        currentOrganization={currentOrganization ?? null}
        currentProject={currentProject ?? null}
        me={me ?? null}
        organizations={organizationConnection ?? null}
        isCDNEnabled={isCDNEnabled ?? null}
      >
        <div
          className={cn(
            'flex h-full w-full',
            hasSchemaChecks || hasActiveSchemaCheck ? 'flex-row gap-x-6' : '',
          )}
        >
          <div>
            <div className="py-6">
              <Title>Schema Checks</Title>
              <Subtitle>Recently checked schemas.</Subtitle>
            </div>
            {query.fetching || query.stale ? null : hasSchemaChecks ? (
              <div className="flex flex-col gap-5">
                <div>
                  <div className="flex h-9 flex-row items-center justify-between">
                    <Label
                      htmlFor="filter-toggle-has-changes"
                      className="text-sm font-normal text-gray-100"
                    >
                      Show only changed schemas
                    </Label>
                    <Switch
                      checked={filters.showOnlyChanged ?? false}
                      onCheckedChange={handleShowOnlyFilterChange}
                      id="filter-toggle-has-changes"
                    />
                  </div>
                  <div className="flex h-9 flex-row items-center justify-between">
                    <Label
                      htmlFor="filter-toggle-status-failed"
                      className="text-sm font-normal text-gray-100"
                    >
                      Show only failed checks
                    </Label>
                    <Switch
                      checked={filters.showOnlyFailed ?? false}
                      onCheckedChange={handleShowOnlyFilterFailed}
                      id="filter-toggle-status-failed"
                    />
                  </div>
                </div>
                {hasFilteredSchemaChecks ? (
                  <div className="flex w-[300px] grow flex-col gap-2.5 overflow-y-auto rounded-md border border-gray-800/50 p-2.5">
                    {paginationVariables.map((cursor, index) => (
                      <Navigation
                        after={cursor}
                        isLastPage={index + 1 === paginationVariables.length}
                        onLoadMore={cursor =>
                          setPaginationVariables(cursors => [...cursors, cursor])
                        }
                        key={cursor ?? 'first'}
                        filters={filters}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="cursor-default text-sm">
                    No schema checks found with the current filters
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="cursor-default text-sm">
                  {hasActiveSchemaCheck ? 'List is empty' : 'Your schema check list is empty'}
                </div>
                <DocsLink href="/features/schema-registry#check-a-schema">
                  {hasActiveSchemaCheck
                    ? 'Check you first schema'
                    : 'Learn how to check your first schema with Hive CLI'}
                </DocsLink>
              </div>
            )}
          </div>
          {hasActiveSchemaCheck ? (
            schemaCheckId ? (
              <ActiveSchemaCheck schemaCheckId={schemaCheckId} key={schemaCheckId} />
            ) : null
          ) : hasSchemaChecks ? (
            <EmptyList
              className="border-0 pt-6"
              title="Select a schema check"
              description="A list of your schema checks is available on the left."
            />
          ) : null}
        </div>
      </TargetLayout>
    </>
  );
}

function ChecksPage() {
  return (
    <>
      <MetaTitle title="Schema Checks" />
      <ChecksPageContent />
    </>
  );
}

export default authenticated(ChecksPage);
