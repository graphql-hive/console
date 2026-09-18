import { Fragment, ReactElement, ReactNode, useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  CircleQuestionMarkIcon,
  GitCompareIcon,
  InfoIcon,
  Loader2,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Popover } from '@/components/base/floating/popover/popover';
import { Select } from '@/components/base/floating/select/select';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { Switch } from '@/components/base/switch/switch';
import { TabbedView, type TabbedViewItem } from '@/components/base/tabs/tabbed-view';
import { Textarea } from '@/components/base/textarea/textarea';
import {
  ChangesBlock,
  CompositionErrorsList,
  CompositionErrorsSection,
  labelize,
  NoGraphChanges,
} from '@/components/target/history/errors-and-changes';
import { Button } from '@/components/ui/button';
import { CopyText } from '@/components/ui/copy-text';
import { File } from '@/components/ui/diffs';
import { DocsLink } from '@/components/ui/docs-note';
import { EmptyList } from '@/components/ui/empty-list';
import { Heading } from '@/components/ui/heading';
import { AlertTriangleIcon, DiffIcon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { TimeAgo } from '@/components/ui/time-ago';
import { DownloadButton } from '@/components/v2/diff-editor';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn } from '@/lib/utils';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  ListBulletIcon,
} from '@radix-ui/react-icons';
import { SDLDiffView, SDLView } from './target-history-schema-version';

/** A status icon inside a tab, explained on hover. */
function StatusTooltip(props: { icon: React.ReactNode; label: string }) {
  return (
    <Tooltip trigger={<span className="inline-flex">{props.icon}</span>} content={props.label} />
  );
}

function AnnotatedSDLView(props: {
  sdl: string;
  annotations?: Array<{
    message: string;
    severity: 'error' | 'warning';
    start: { line: number; character: number };
    end: { line: number; character: number };
  }>;
}) {
  return (
    <div className="max-w-[inherit]">
      <File
        file={{
          name: 'schema.graphql',
          contents: props.sdl,
        }}
        options={{
          disableFileHeader: true,
        }}
        lineAnnotations={props.annotations?.map(annotation => ({
          lineNumber: annotation.start.line,
          metadata: { message: annotation.message, severity: annotation.severity },
        }))}
        renderAnnotation={annotation => (
          <div
            className={cn(
              'border-l-5 flex items-center pl-1',
              annotation.metadata.severity === 'warning'
                ? 'border-yellow-400 bg-yellow-100 text-yellow-800'
                : 'border-red-500 bg-red-100 text-red-800',
            )}
          >
            <span>{annotation.metadata.message}</span>
            {annotation.metadata.severity === 'warning' ? (
              <TriangleAlertIcon className="ml-auto mr-2 size-4 text-yellow-800" />
            ) : (
              <ShieldAlertIcon className="ml-auto mr-2 size-4 text-red-800" />
            )}
          </div>
        )}
      />
    </div>
  );
}

function SDLSingleView(props: {
  title?: ReactElement;
  sdl: string;
  downloadFileName?: string;
}): ReactElement {
  return (
    <div className="w-full">
      <div className="border-neutral-3 flex items-center justify-between border-b px-2 py-1">
        <div className="px-2 font-bold">{props.title}</div>
        <div className="ml-auto flex h-[36px] items-center px-2">
          {props.sdl && props.downloadFileName && (
            <DownloadButton fileName={props.downloadFileName} contents={props.sdl} />
          )}
        </div>
      </div>
      <SDLView sdl={props.sdl} />
    </div>
  );
}

function SDLSingleDiffToggleView(props: {
  title?: ReactElement;
  before: string | null;
  after: string | null;
  downloadFileName?: string;
}): ReactElement {
  const [showDiff, setShowDiff] = useState<boolean>(true);
  const title = props?.title ?? 'Diff View';

  return (
    <div className="w-full">
      <div className="border-neutral-3 flex items-center justify-between border-b px-2 py-1">
        <div className="px-2 font-bold">{title}</div>
        <div className="ml-auto flex h-[36px] items-center px-2">
          {props.after && props.downloadFileName && (
            <DownloadButton fileName={props.downloadFileName} contents={props.after} />
          )}

          <div className="ml-2 flex items-center space-x-2">
            <Label htmlFor="toggle-diff-mode" className="text-xs font-normal">
              Toggle Diff
            </Label>
            <Switch
              id="toggle-diff-mode"
              checked={showDiff}
              onCheckedChange={isChecked => setShowDiff(isChecked)}
            />
          </div>
        </div>
      </div>
      {showDiff ? (
        <SDLDiffView before={props.before ?? ''} after={props.after ?? ''} />
      ) : (
        <SDLView sdl={props.after ?? ''} />
      )}
    </div>
  );
}

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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
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
        <p className="text-neutral-10 text-sm">{mutation.error.message}</p>
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
        <p className="text-neutral-10 text-sm">
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
        <p className="text-neutral-10 text-sm">Acknowledge and accept breaking changes.</p>
        {props?.contextId ? (
          <p className="text-neutral-10 text-sm">
            Approval applies to all future changes within the context of a pull request or branch
            lifecycle: <span className="font-medium">{props?.contextId}</span>
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Textarea
          value={approvalComment}
          onChange={onApprovalCommentChange}
          placeholder="(Optional)  Add a comment..."
        />
        <div className="text-right">
          <Button
            variant="destructive"
            disabled={mutation.fetching}
            onClick={async e => {
              e.preventDefault();
              await approve({
                input: {
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                  schemaCheckId: props.schemaCheckId,
                  comment: approvalComment,
                },
              });
              props.onClose();
            }}
          >
            {mutation.fetching ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Please wait
              </>
            ) : (
              'Approve Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const BreakingChangesTitle = () => {
  return (
    <>
      Breaking Changes
      <Popover
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-1"
            aria-label="About breaking changes"
          >
            <InfoCircledIcon className="size-3" />
          </Button>
        }
        openOnHover
        align="start"
        width="xl"
        content={
          <div className="text-neutral-11 font-normal">
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
        }
      />
    </>
  );
};

const PolicyInfo = () => {
  return (
    <Popover
      trigger={
        <button type="button" aria-label="About policy line numbers" className="ml-2 inline-block">
          <InfoIcon size={14} />
        </button>
      }
      openOnHover
      align="start"
      width="auto"
      content={
        <p className="text-neutral-11 text-sm">
          Schema policy checks run on the composed API schema. Line numbers
          <br />
          reflect that and will not match the lines from the source schema.
        </p>
      }
    />
  );
};

const PolicyBlock = (props: {
  title: string;
  policies: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment>;
  type: 'warning' | 'error';
  goToline?: (line: number | undefined) => void;
}) => {
  const policies = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.policies);
  return (
    <div>
      <h2 className="text-neutral-10 mb-3 text-sm font-bold">
        {props.title} <PolicyInfo />
      </h2>
      <ul className="list-inside list-disc pl-3 text-sm/relaxed">
        {policies.edges.map((edge, key) => (
          <li
            key={key}
            className={cn(props.type === 'warning' ? 'text-yellow-400' : 'text-red-400', 'my-1')}
          >
            <span className="text-neutral-10 text-left">
              {labelize(edge.node.message.replace(/\.$/, ''))}{' '}
            </span>
            {edge.node.start?.line ? (
              <span
                className="text-neutral-9 ml-1 cursor-default text-xs hover:underline"
                onClick={() => props.goToline?.(edge.node.start?.line || undefined)}
              >
                on line {edge.node.start.line}
              </span>
            ) : null}
            <Popover
              trigger={
                <button
                  type="button"
                  aria-label="Which rule"
                  className="text-neutral-6 ml-2 inline-block"
                >
                  <CircleQuestionMarkIcon size={16} />
                </button>
              }
              openOnHover
              width="auto"
              content={
                <p className="text-neutral-11 text-sm">
                  rule: <span className="text-neutral-12">{edge.node.ruleId}</span>
                </p>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

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
          id
          slug
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
      <div className="text-neutral-10 mb-5 mt-10 text-sm">
        Get more out of schema checks by enabling conditional breaking changes based on usage data.
        <br />
        <DocsLink
          href="/schema-registry/management/targets#conditional-breaking-changes"
          text="Learn more about conditional breaking changes."
        />
      </div>
    );
  }

  const numberOfTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.length;
  const truncatedTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.slice(
    0,
    3,
  );
  const excludedTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets.slice(3);
  const allTargets = schemaCheck.conditionalBreakingChangeMetadata.settings.targets;

  return (
    <div className="text-neutral-10 mb-5 mt-10 text-sm">
      <p>
        Based on{' '}
        <span className="text-neutral-12">
          {schemaCheck.conditionalBreakingChangeMetadata.usage.totalRequestCountFormatted} requests
        </span>{' '}
        from target
        {numberOfTargets === 1 ? '' : 's'}{' '}
        {numberOfTargets <= 3 && (
          <>
            {allTargets.map((target, index) => (
              <Fragment key={target.slug}>
                <span className="text-neutral-12">{target.slug}</span>
                {index === allTargets.length - 1 ? null : ', '}
              </Fragment>
            ))}
          </>
        )}
        {numberOfTargets > 3 && (
          <>
            {truncatedTargets.map((target, index) => (
              <Fragment key={target.slug}>
                <span className="text-neutral-12">{target.slug}</span>
                {index === truncatedTargets.length - 1 ? null : ', '}
              </Fragment>
            ))}
            {' and '}
            <Popover
              trigger={
                <Button variant="link" className="p-0">
                  {excludedTargets.length} more
                </Button>
              }
              content={
                <div className="p-2">
                  <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
                  <ScrollArea height="sm">
                    <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                      {allTargets.map((target, index) => (
                        <div key={index} className="py-2">
                          <div className="text-neutral-10 line-clamp-3 text-sm">{target.slug}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              }
            />
          </>
        )}
        . <br />
        Usage data ranges from{' '}
        <span className="text-neutral-12">
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.from, 'do MMM yyyy HH:mm')}
        </span>{' '}
        to{' '}
        <span className="text-neutral-12">
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.to, 'do MMM yyyy HH:mm')} (
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.to, 'z')})
        </span>{' '}
        (period of {schemaCheck.conditionalBreakingChangeMetadata.settings.retentionInDays} day
        {schemaCheck.conditionalBreakingChangeMetadata.settings.retentionInDays === 1 ? '' : 's'}
        ).
        <br />
        <DocsLink
          href="/schema-registry/management/targets#conditional-breaking-changes"
          text="Learn more about conditional breaking changes."
        />
      </p>
    </div>
  );
}

const DefaultSchemaView_SchemaCheckFragment = graphql(`
  fragment DefaultSchemaView_SchemaCheckFragment on SchemaCheck {
    id
    schemaSDL
    serviceName
    hasSchemaCompositionErrors
    baseline {
      sdl
      publicSdl
      supergraphSdl
      compositionErrors {
        message
      }
      meta {
        commit
      }
    }
    meta {
      commit
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
      edges {
        node {
          ...ChangesBlock_SchemaChangeWithUsageFragment
        }
      }
    }
    safeSchemaChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
        }
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  /** The contract picker, leading the tab strip. */
  action?: ReactNode;
}) {
  const schemaCheck = useFragment(DefaultSchemaView_SchemaCheckFragment, props.schemaCheck);
  const [selectedView, setSelectedView] = useState<string>('details');
  const [scrollToLine, setScrollToLine] = useState<number | undefined>();

  const items: TabbedViewItem[] = [
    {
      value: 'details',
      label: 'Details',
      icon: ListBulletIcon,
      attrs: { 'data-testid': 'details-view-btn' },
      content: (
        <div className="p-5">
          {!schemaCheck.schemaPolicyWarnings?.edges?.length &&
            !schemaCheck.safeSchemaChanges?.edges?.length &&
            !schemaCheck.breakingSchemaChanges?.edges?.length &&
            !schemaCheck.schemaPolicyErrors?.edges?.length &&
            !schemaCheck.hasSchemaCompositionErrors &&
            !schemaCheck.baseline?.compositionErrors?.length && <NoGraphChanges />}
          {schemaCheck.baseline?.compositionErrors?.length ? (
            <CompositionErrorsList
              title="Baseline Composition Errors"
              description="The supplied baseline could not be composed, no schema diff could be performed."
              errors={schemaCheck.baseline.compositionErrors}
            />
          ) : null}
          {schemaCheck.__typename === 'FailedSchemaCheck' && schemaCheck.compositionErrors && (
            <CompositionErrorsSection compositionErrors={schemaCheck.compositionErrors} />
          )}
          {schemaCheck.breakingSchemaChanges?.edges.length ? (
            <div className="mb-5">
              <ChangesBlock
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                schemaCheckId={schemaCheck.id}
                title={<BreakingChangesTitle />}
                changesWithUsage={schemaCheck.breakingSchemaChanges.edges.map(edge => edge.node)}
                conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
              />
            </div>
          ) : null}
          {schemaCheck.safeSchemaChanges ? (
            <div className="mb-5">
              <ChangesBlock
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                schemaCheckId={schemaCheck.id}
                title="Safe Changes"
                changes={schemaCheck.safeSchemaChanges.edges.map(edge => edge.node)}
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
                goToline={line => {
                  setScrollToLine(Math.max((line ?? 0) - 1, 0));
                  setSelectedView('policy');
                }}
              />
            </div>
          ) : null}
          <ConditionalBreakingChangesMetadataSection schemaCheck={schemaCheck} />
        </div>
      ),
    },
  ];

  if (schemaCheck.serviceName) {
    items.push({
      value: 'service',
      label: 'Service',
      icon: DiffIcon,
      attrs: { 'data-testid': 'service-view-btn' },
      content:
        schemaCheck.baseline?.sdl === schemaCheck.schemaSDL ? (
          <SDLSingleView
            sdl={schemaCheck.schemaSDL}
            downloadFileName="service.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className="flex items-center gap-1">
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className="font-mono" data-testid="schema-title-before">
                        {schemaCheck.serviceName}@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className="inline size-3" />
                    </>
                  ) : null}
                  <span className="font-mono" data-testid="schema-title">
                    {schemaCheck.serviceName}@
                    {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                  </span>
                  <span data-testid="schema-title-changed">(unchanged)</span>
                </span>
              ) : undefined
            }
          />
        ) : (
          <SDLSingleDiffToggleView
            title={
              schemaCheck.serviceName ? (
                <span className="flex items-center gap-1">
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className="font-mono">
                        {schemaCheck.serviceName}@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className="inline size-3" />
                    </>
                  ) : null}
                  <span className="font-mono">
                    {schemaCheck.serviceName}@
                    {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                  </span>
                </span>
              ) : undefined
            }
            before={schemaCheck.baseline?.sdl ?? null}
            after={schemaCheck.schemaSDL}
            downloadFileName="service.graphqls"
          />
        ),
    });
  }

  items.push({
    value: 'schema',
    label: 'Public Schema',
    icon: DiffIcon,
    attrs: { 'data-testid': 'schema-view-btn' },
    disabled: !schemaCheck.compositeSchemaSDL,
    tooltip: schemaCheck.compositeSchemaSDL
      ? undefined
      : 'Composition did not succeed. No public schema SDL available.',
    content:
      schemaCheck.baseline?.publicSdl === schemaCheck.compositeSchemaSDL ? (
        <SDLSingleView
          sdl={schemaCheck.schemaSDL}
          downloadFileName="schema.graphqls"
          title={
            schemaCheck.serviceName ? (
              <span className="flex items-center gap-1">
                {schemaCheck.baseline?.meta ? (
                  <>
                    <span className="font-mono" data-testid="schema-title-before">
                      schema@
                      {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                    </span>
                    <ArrowRight className="inline size-3" />
                  </>
                ) : null}
                <span className="font-mono" data-testid="schema-title">
                  schema@
                  {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                </span>
                <span data-testid="schema-title-changed">(unchanged)</span>
              </span>
            ) : undefined
          }
        />
      ) : (
        <SDLSingleDiffToggleView
          before={schemaCheck.baseline?.publicSdl ?? null}
          after={schemaCheck.compositeSchemaSDL ?? null}
          downloadFileName="schema.graphqls"
        />
      ),
  });

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      label: 'Supergraph',
      icon: DiffIcon,
      attrs: { 'data-testid': 'supergraph-view-btn' },
      disabled: !schemaCheck.supergraphSDL,
      tooltip: schemaCheck.supergraphSDL
        ? undefined
        : 'Composition did not succeed. No Supergraph available.',
      content:
        schemaCheck?.baseline?.supergraphSdl === schemaCheck.supergraphSDL ? (
          <SDLSingleView
            sdl={schemaCheck?.baseline?.supergraphSdl ?? ''}
            downloadFileName="supergraph.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className="flex items-center gap-1">
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className="font-mono" data-testid="schema-title-before">
                        supergraph@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className="inline size-3" />
                    </>
                  ) : null}
                  <span className="font-mono" data-testid="schema-title">
                    supergraph@
                    {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                  </span>
                  <span data-testid="schema-title-changed">(unchanged)</span>
                </span>
              ) : undefined
            }
          />
        ) : (
          <SDLSingleDiffToggleView
            before={schemaCheck?.baseline?.supergraphSdl ?? null}
            after={schemaCheck?.supergraphSDL ?? null}
            downloadFileName="supergraph.graphqls"
          />
        ),
    });
  }

  items.push({
    value: 'policy',
    label: 'Policy',
    icon: AlertTriangleIcon,
    attrs: { 'data-testid': 'policy-view-btn' },
    disabled:
      !schemaCheck.schemaPolicyWarnings &&
      !(
        schemaCheck.__typename === 'FailedSchemaCheck' &&
        schemaCheck.schemaPolicyErrors?.edges?.length
      ),
    content: (
      <>
        <div className="px-5 py-3">
          <Heading>Schema Policy</Heading>
        </div>
        <SchemaPolicyEditor
          compositeSchemaSDL={schemaCheck.schemaSDL ?? ''}
          warnings={schemaCheck.schemaPolicyWarnings ?? null}
          errors={('schemaPolicyErrors' in schemaCheck && schemaCheck.schemaPolicyErrors) || null}
          scrollToLine={scrollToLine}
        />
      </>
    ),
  });

  return (
    <TabbedView
      items={items}
      value={selectedView}
      onValueChange={value => {
        setScrollToLine(undefined);
        setSelectedView(value);
      }}
      action={props.action}
      bodyPadding="none"
    />
  );
}

const ContractCheckView_ContractCheckFragment = graphql(`
  fragment ContractCheckView_ContractCheckFragment on ContractCheck {
    id
    schemaCompositionErrors {
      ...CompositionErrorsSection_SchemaErrorConnection
    }
    breakingSchemaChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeWithUsageFragment
        }
      }
    }
    safeSchemaChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
        }
      }
    }
    compositeSchemaSDL
    supergraphSDL
    baseline {
      publicSdl
      supergraphSdl
      compositionErrors {
        message
      }
    }
  }
`);

const ContractCheckView_SchemaCheckFragment = graphql(`
  fragment ContractCheckView_SchemaCheckFragment on SchemaCheck {
    id
    serviceName
    meta {
      commit
    }
    baseline {
      meta {
        commit
      }
    }
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  /** The contract picker, leading the tab strip. */
  action?: ReactNode;
}) {
  const contractCheck = useFragment(ContractCheckView_ContractCheckFragment, props.contractCheck);
  const schemaCheck = useFragment(ContractCheckView_SchemaCheckFragment, props.schemaCheck);

  const [selectedView, setSelectedView] = useState<string>('details');

  const items: TabbedViewItem[] = [
    {
      value: 'details',
      label: 'Details',
      icon: ListBulletIcon,
      content: (
        <div className="p-5">
          {contractCheck.baseline?.compositionErrors?.length ? (
            <CompositionErrorsList
              title="Baseline Composition Errors"
              description="The supplied contract baseline could not be composed, no schema diff could be performed."
              errors={contractCheck.baseline.compositionErrors}
            />
          ) : null}
          {contractCheck.schemaCompositionErrors && (
            <CompositionErrorsSection compositionErrors={contractCheck.schemaCompositionErrors} />
          )}
          {contractCheck.breakingSchemaChanges?.edges.length && (
            <div className="mb-2">
              <ChangesBlock
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                schemaCheckId={schemaCheck.id}
                title={<BreakingChangesTitle />}
                changesWithUsage={contractCheck.breakingSchemaChanges.edges.map(edge => edge.node)}
                conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
              />
            </div>
          )}
          {contractCheck.safeSchemaChanges && (
            <div className="mb-2">
              <ChangesBlock
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                schemaCheckId={schemaCheck.id}
                title="Safe Changes"
                changes={contractCheck.safeSchemaChanges.edges.map(edge => edge.node)}
              />
            </div>
          )}
          {!contractCheck.breakingSchemaChanges &&
          !contractCheck.safeSchemaChanges &&
          !contractCheck.schemaCompositionErrors &&
          !contractCheck.baseline?.compositionErrors?.length ? (
            <NoGraphChanges />
          ) : (
            <ConditionalBreakingChangesMetadataSection schemaCheck={schemaCheck} />
          )}
        </div>
      ),
    },
    {
      value: 'schema',
      label: 'Public Schema',
      icon: DiffIcon,
      disabled: !contractCheck.compositeSchemaSDL,
      tooltip: contractCheck.compositeSchemaSDL
        ? undefined
        : 'Composition did not succeed. No public schema SDL available.',
      content:
        contractCheck?.baseline?.publicSdl === contractCheck.compositeSchemaSDL ? (
          <SDLSingleView
            sdl={contractCheck.compositeSchemaSDL ?? ''}
            downloadFileName="service.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className="flex items-center gap-1">
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className="font-mono">
                        schema@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className="inline size-3" />
                    </>
                  ) : null}
                  <span className="font-mono">
                    schema@
                    {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                  </span>
                  (unchanged)
                </span>
              ) : undefined
            }
          />
        ) : (
          <SDLSingleDiffToggleView
            before={contractCheck?.baseline?.publicSdl ?? null}
            after={contractCheck.compositeSchemaSDL ?? null}
            downloadFileName="schema.graphqls"
          />
        ),
    },
  ];

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      label: 'Supergraph',
      icon: DiffIcon,
      disabled: !contractCheck.supergraphSDL,
      tooltip: contractCheck.supergraphSDL
        ? undefined
        : 'Composition did not succeed. No Supergraph available.',
      content:
        contractCheck?.baseline?.supergraphSdl === contractCheck?.supergraphSDL ? (
          <SDLSingleView
            sdl={contractCheck?.supergraphSDL ?? ''}
            downloadFileName="supergraph.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className="flex items-center gap-1">
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className="font-mono">
                        supergraph@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className="inline size-3" />
                    </>
                  ) : null}
                  <span className="font-mono">
                    supergraph@
                    {schemaCheck.meta?.commit.substring(0, 7) ?? <>unknown</>}
                  </span>
                  (unchanged)
                </span>
              ) : undefined
            }
          />
        ) : (
          <SDLSingleDiffToggleView
            before={contractCheck?.baseline?.supergraphSdl ?? null}
            after={contractCheck?.supergraphSDL ?? null}
            downloadFileName="supergraph.graphqls"
          />
        ),
    });
  }

  return (
    <TabbedView
      items={items}
      value={selectedView}
      onValueChange={setSelectedView}
      action={props.action}
      bodyPadding="none"
    />
  );
}

const SchemaPolicyEditor_PolicyWarningsFragment = graphql(`
  fragment SchemaPolicyEditor_PolicyWarningsFragment on SchemaPolicyWarningConnection {
    edges {
      node {
        message
        ruleId
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

const SchemaPolicyEditor = (props: {
  compositeSchemaSDL: string;
  warnings: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment> | null;
  errors: FragmentType<typeof SchemaPolicyEditor_PolicyWarningsFragment> | null;
  scrollToLine?: number;
}) => {
  const warnings = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.warnings);
  const errors = useFragment(SchemaPolicyEditor_PolicyWarningsFragment, props.errors);
  return (
    <AnnotatedSDLView
      sdl={props.compositeSchemaSDL}
      annotations={[
        ...(warnings?.edges.map(edge => ({
          start: {
            line: (edge.node.start?.line ?? 0) - 1,
            character: (edge.node.start?.column ?? 0) - 1,
          },
          end: {
            line: (edge.node.end?.line ?? 0) - 1,
            character: (edge.node.end?.column ?? 0) - 1,
          },
          message: edge.node.message,
          severity: 'warning' as const,
        })) ?? []),
        ...(errors?.edges.map(edge => ({
          start: {
            line: (edge.node.start?.line ?? 0) - 1,
            character: (edge.node.start?.column ?? 0) - 1,
          },
          end: {
            line: (edge.node.end?.line ?? 0) - 1,
            character: (edge.node.end?.column ?? 0) - 1,
          },
          lineNumber: edge.node.start?.line ?? 0,
          message: edge.node.message,
          severity: 'error' as const,
        })) ?? []),
      ]}
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const schemaCheck = useFragment(SchemaChecksView_SchemaCheckFragment, props.schemaCheck);

  const [selectedItem, setSelectedItem] = useResetState<string>(() => 'default', [schemaCheck.id]);
  const selectedContractCheckNode = useMemo(
    () =>
      schemaCheck.contractChecks?.edges?.find(edge => edge.node.id === selectedItem)?.node ?? null,
    [selectedItem, schemaCheck],
  );

  const contractChecks = schemaCheck.contractChecks?.edges ?? [];
  const contractPicker = contractChecks.length ? (
    <Select
      value={selectedItem}
      onValueChange={setSelectedItem}
      options={[
        {
          value: 'default',
          label: 'Default Graph',
          trailing: checkStatusIcon(schemaCheck, 'Schema changed'),
        },
        ...contractChecks.map(edge => ({
          value: edge.node.id,
          label: edge.node.contractName,
          trailing: checkStatusIcon(edge.node, 'Contract schema changed'),
        })),
      ]}
      size="compact"
      onSurface="raised"
      width="md"
    />
  ) : undefined;

  return selectedContractCheckNode ? (
    <ContractCheckView
      key={selectedContractCheckNode.id}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      contractCheck={selectedContractCheckNode}
      schemaCheck={schemaCheck}
      projectType={props.projectType}
      action={contractPicker}
    />
  ) : (
    <DefaultSchemaView
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      schemaCheck={schemaCheck}
      projectType={props.projectType}
      action={contractPicker}
    />
  );
}

function checkStatusIcon(
  check: {
    hasSchemaCompositionErrors: boolean;
    hasUnapprovedBreakingChanges: boolean;
    hasSchemaChanges: boolean;
  },
  changedLabel: string,
) {
  if (check.hasSchemaCompositionErrors) {
    return (
      <StatusTooltip
        icon={<ExclamationTriangleIcon className="text-warning size-3.5" />}
        label="Composition failed."
      />
    );
  }
  if (check.hasUnapprovedBreakingChanges) {
    return (
      <StatusTooltip
        icon={<ExclamationTriangleIcon className="text-warning size-3.5" />}
        label="Unapproved breaking changes!"
      />
    );
  }
  if (check.hasSchemaChanges) {
    return <StatusTooltip icon={<GitCompareIcon className="size-3.5" />} label={changedLabel} />;
  }
  return (
    <StatusTooltip
      icon={<CheckIcon className="text-success size-3.5" />}
      label="Composition succeeded."
    />
  );
}

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
      cliApprovalMetadata {
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
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $schemaCheckId: ID!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      type
      target: targetBySlug(targetSlug: $targetSlug) {
        id
        schemaCheck(id: $schemaCheckId) {
          ...ActiveSchemaCheck_SchemaCheckFragment
        }
      }
    }
  }
`);

const ActiveSchemaCheck = (props: {
  schemaCheckId: string | null;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): React.ReactElement | null => {
  const { schemaCheckId } = props;
  const [query] = useQuery({
    query: ActiveSchemaCheckQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      schemaCheckId: schemaCheckId ?? '',
    },
    pause: !schemaCheckId,
  });
  const [approvalOpen, setApprovalOpen] = useState(false);

  const schemaCheck = useFragment(
    ActiveSchemaCheck_SchemaCheckFragment,
    query.data?.project?.target?.schemaCheck,
  );

  if (!schemaCheckId) {
    return null;
  }

  if (query.fetching || query.stale) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center self-center">
        <div className="text-neutral-10 flex flex-col items-center text-sm">
          <Spinner className="mb-3 size-8" />
          Loading Schema Check...
        </div>
      </div>
    );
  }

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (!schemaCheck || !query.data?.project) {
    return (
      <EmptyList
        className="border-0"
        title="Check not found"
        description="Learn how to check your schema with Hive CLI"
        docsUrl="/schema-registry#check-a-schema"
      />
    );
  }

  return (
    <div className="flex h-full max-w-[-webkit-fill-available] grow flex-col">
      <div className="py-6">
        <Title>Check {schemaCheck.id}</Title>
        <Subtitle>Detailed view of the schema check</Subtitle>
      </div>
      <div className="mb-3">
        <div className="border-neutral-5 text-neutral-10 grid items-center justify-between gap-x-4 gap-y-2 rounded-md border p-4 font-medium md:grid-flow-col md:grid-rows-2 lg:grid-rows-1">
          <div className="min-w-0">
            <div className="text-xs">Status</div>
            <div
              className={cn(
                'text-neutral-12 truncate text-sm font-semibold',
                schemaCheck.__typename === 'FailedSchemaCheck' && 'text-red-600',
              )}
            >
              {schemaCheck.__typename === 'FailedSchemaCheck' ? <>Failed</> : <>Success</>}
            </div>
          </div>
          {schemaCheck.serviceName ? (
            <div className="min-w-0">
              <div className="text-xs">Service</div>
              <div
                className="text-neutral-12 truncate text-sm font-semibold"
                title={schemaCheck.serviceName}
              >
                {schemaCheck.serviceName}
              </div>
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="text-xs">
              Triggered <TimeAgo date={schemaCheck.createdAt} />
            </div>
            {schemaCheck.meta?.author && (
              <div className="text-neutral-12 truncate text-sm" title={schemaCheck.meta.author}>
                by {schemaCheck.meta.author}
              </div>
            )}
          </div>
          {schemaCheck.meta?.commit && (
            <div className="min-w-0">
              <div className="text-xs">Commit</div>
              <div
                className="text-neutral-12 truncate text-sm font-semibold"
                title={schemaCheck.meta.commit}
              >
                <CopyText>{schemaCheck.meta.commit}</CopyText>
              </div>
            </div>
          )}
          {schemaCheck.__typename === 'FailedSchemaCheck' && schemaCheck.canBeApproved ? (
            <div className="ml-auto mr-0 pl-4">
              {schemaCheck.canBeApprovedByViewer ? (
                <Popover
                  open={approvalOpen}
                  onOpenChange={setApprovalOpen}
                  trigger={
                    <Button variant="destructive" disabled={approvalOpen}>
                      Approve{' '}
                      {approvalOpen ? (
                        <ChevronUp className="ml-2 size-4" />
                      ) : (
                        <ChevronDown className="ml-2 size-4" />
                      )}
                    </Button>
                  }
                  width="lg"
                  align="end"
                  arrow
                  content={
                    <ApproveFailedSchemaCheckModal
                      onClose={() => setApprovalOpen(false)}
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                      schemaCheckId={schemaCheck.id}
                      contextId={schemaCheck.contextId}
                    />
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>
        {schemaCheck.__typename === 'SuccessfulSchemaCheck' && schemaCheck.isApproved ? (
          <div className="py-6">
            <div className="border-neutral-2 text-neutral-10 flex flex-row items-center gap-x-6 rounded-md border p-4 font-medium">
              <div>
                <Tooltip
                  trigger={
                    <span className="inline-flex">
                      <BadgeCheck className="size-6 text-green-500" />
                    </span>
                  }
                  content={
                    <>
                      Schema Check was manually approved by{' '}
                      {schemaCheck.approvedBy?.displayName ??
                        schemaCheck.cliApprovalMetadata?.displayName ??
                        'unknown'}
                      .
                    </>
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">
                  {schemaCheck.approvedBy?.displayName ??
                    schemaCheck.cliApprovalMetadata?.displayName ??
                    'unknown'}
                </p>
                <p className="text-neutral-10 text-sm">
                  {schemaCheck.approvedBy?.email ??
                    schemaCheck.cliApprovalMetadata?.email ??
                    'unknown'}
                </p>
              </div>
              {schemaCheck.approvalComment ? (
                <div className="text-neutral-12 text-sm italic">
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
      <SchemaChecksView
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        schemaCheck={schemaCheck}
        projectType={query.data.project.type}
      />
    </div>
  );
};

export function TargetChecksSinglePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
}) {
  return (
    <>
      <Meta title={`Schema check ${props.schemaCheckId}`} />
      <ActiveSchemaCheck
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        schemaCheckId={props.schemaCheckId}
      />
    </>
  );
}
