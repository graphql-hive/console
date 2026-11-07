import { Fragment, ReactElement, ReactNode, useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  BadgeCheck,
  CheckIcon,
  ChevronDown,
  ChevronUp,
  CircleQuestionMarkIcon,
  FileDiffIcon,
  GitCompareIcon,
  InfoIcon,
  ListIcon,
  Loader2,
  ScaleIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { useChangePageLoaders } from '@/components/target/checks/change-pages';
import {
  SDL_TABS,
  SdlPane,
  useCheckSdl,
  useContractCheckSdl,
  withCheckSdl,
  withContractCheckSdl,
  withSdlState,
} from '@/components/target/checks/check-sdl';
import { ContractFailuresTable } from '@/components/target/checks/contract-failures-table';
import { ServiceFilterButton } from '@/components/target/checks/service-filter-button';
import {
  ChangesTitle,
  CompositionErrorsList,
  CompositionErrorsSection,
  labelize,
  NoGraphChanges,
} from '@/components/target/history/errors-and-changes';
import { PagedBreakingChanges, SafeChangeGroups } from '@/components/target/history/paged-changes';
import { CopyText } from '@/components/ui/copy-text';
import { DownloadButton } from '@/components/ui/diff-editor';
import { CodeScrollArea, File } from '@/components/ui/diffs';
import { DocsLink } from '@/components/ui/docs-note';
import { EmptyList } from '@/components/ui/empty-list';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Button } from '@/components/ui/primitives/button/button';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Label } from '@/components/ui/primitives/label/label';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { Switch } from '@/components/ui/primitives/switch/switch';
import { Textarea } from '@/components/ui/primitives/textarea/textarea';
import { QueryError } from '@/components/ui/query-error';
import { ScopeBar } from '@/components/ui/scope-bar/scope-bar';
import { TabbedView, type TabbedViewItem } from '@/components/ui/tabbed-view/tabbed-view';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn, formatCount } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { SDLDiffView, SDLView } from './target-history-schema-version';
import * as styles from './target-checks-single.css';

/** A status icon inside a tab, explained on hover. */
function StatusTooltip(props: { icon: ReactNode; label: string }) {
  return (
    <Tooltip
      trigger={
        <span className={styles.statusTooltipSpan} role="img" aria-label={props.label}>
          {props.icon}
        </span>
      }
      content={props.label}
    />
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
    <CodeScrollArea>
      <div className={styles.annotatedSDLViewDiv}>
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
                styles.annotatedSDLViewDiv2,
                annotation.metadata.severity === 'warning'
                  ? styles.annotatedSDLViewDiv3
                  : styles.annotatedSDLViewDiv4,
              )}
            >
              <span>{annotation.metadata.message}</span>
              {annotation.metadata.severity === 'warning' ? (
                <TriangleAlertIcon className={styles.annotatedSDLViewTriangleAlertIcon} />
              ) : (
                <ShieldAlertIcon className={styles.annotatedSDLViewShieldAlertIcon} />
              )}
            </div>
          )}
        />
      </div>
    </CodeScrollArea>
  );
}

function SDLSingleView(props: {
  title?: ReactElement;
  sdl: string;
  downloadFileName?: string;
}): ReactElement {
  return (
    <SdlPane
      title={props.title}
      actions={
        props.sdl && props.downloadFileName ? (
          <DownloadButton fileName={props.downloadFileName} contents={props.sdl} />
        ) : null
      }
    >
      <SDLView sdl={props.sdl} />
    </SdlPane>
  );
}

function SDLSingleDiffToggleView(props: {
  title?: ReactElement;
  before: string | null;
  after: string | null;
  downloadFileName?: string;
  sorted?: boolean;
}): ReactElement {
  const [showDiff, setShowDiff] = useState<boolean>(true);
  const title = props?.title ?? 'Diff View';

  return (
    <SdlPane
      title={title}
      actions={
        <>
          {props.sorted && showDiff ? (
            <span className={styles.sDLSingleDiffToggleViewSpan}>Sorted by kind and name</span>
          ) : null}
          {props.after && props.downloadFileName && (
            <DownloadButton fileName={props.downloadFileName} contents={props.after} />
          )}
          <div className={styles.sDLSingleDiffToggleViewDiv}>
            <Label variant="inline" htmlFor="toggle-diff-mode" label="Toggle Diff" />
            <Switch
              id="toggle-diff-mode"
              checked={showDiff}
              onCheckedChange={isChecked => setShowDiff(isChecked)}
            />
          </div>
        </>
      }
    >
      {showDiff ? (
        <SDLDiffView
          before={props.before ?? ''}
          after={props.after ?? ''}
          sorted={props.sorted}
          tooLargeMessage="Every change is listed in the Details tab. To browse the full schema, switch off the diff, or download it."
        />
      ) : (
        <SDLView sdl={props.after ?? ''} />
      )}
    </SdlPane>
  );
}

export const ApproveFailedSchemaCheckMutation = graphql(`
  mutation ApproveFailedSchemaCheckModal_ApproveFailedSchemaCheckMutation(
    $input: ApproveFailedSchemaCheckInput!
  ) {
    approveFailedSchemaCheck(input: $input) {
      ok {
        schemaCheck {
          __typename
          id
          contractChecks {
            edges {
              node {
                id
              }
            }
          }
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
  schemaCheckId: string;
  contextId: string | null | undefined;
  onClose(): void;
}) {
  const [mutation, approve] = useMutation(ApproveFailedSchemaCheckMutation);
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [approvalComment, setApprovalComment] = useState<string>('');
  const onApprovalCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setApprovalComment(e.target.value);
    },
    [setApprovalComment],
  );

  if (mutation.error) {
    return (
      <div className={styles.approveFailedSchemaCheckModalDiv}>
        <h4 className={styles.approveFailedSchemaCheckModalH4}>
          Oops. Something unexpected happened
        </h4>
        <p className={styles.approveFailedSchemaCheckModalP}>{mutation.error.message}</p>
        <div className={styles.approveFailedSchemaCheckModalDiv2}>
          <Button onSurface="raised" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (mutation.data?.approveFailedSchemaCheck.error) {
    return (
      <div className={styles.approveFailedSchemaCheckModalDiv}>
        <h4 className={styles.approveFailedSchemaCheckModalH4}>Approval failed</h4>
        <p className={styles.approveFailedSchemaCheckModalP}>
          {mutation.data.approveFailedSchemaCheck.error.message}
        </p>
        <div className={styles.approveFailedSchemaCheckModalDiv2}>
          <Button onSurface="raised" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (mutation.data?.approveFailedSchemaCheck.ok) {
    return (
      <div className={styles.approveFailedSchemaCheckModalDiv}>
        <h4 className={styles.approveFailedSchemaCheckModalH4}>
          The schema check has been approved successfully!
        </h4>
        <div className={styles.approveFailedSchemaCheckModalDiv2}>
          <Button onSurface="raised" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.approveFailedSchemaCheckModalDiv}>
      <h4 className={styles.approveFailedSchemaCheckModalH4}>Finish your approval</h4>
      <div>
        <p className={styles.approveFailedSchemaCheckModalP}>
          Acknowledge and accept breaking changes.
        </p>
        {props?.contextId ? (
          <p className={styles.approveFailedSchemaCheckModalP}>
            Approval applies to all future changes within the context of a pull request or branch
            lifecycle: <span className={shared.weight.medium}>{props?.contextId}</span>
          </p>
        ) : null}
      </div>
      <div className={styles.approveFailedSchemaCheckModalDiv}>
        <Textarea
          value={approvalComment}
          onChange={onApprovalCommentChange}
          placeholder="(Optional)  Add a comment..."
        />
        <div className={styles.approveFailedSchemaCheckModalDiv2}>
          <Button
            variant="destructive"
            disabled={mutation.fetching}
            onClick={async e => {
              e.preventDefault();
              await approve({
                input: {
                  organizationSlug,
                  projectSlug,
                  targetSlug,
                  schemaCheckId: props.schemaCheckId,
                  comment: approvalComment,
                },
              });
              props.onClose();
            }}
          >
            {mutation.fetching ? (
              <>
                <Loader2 className={styles.approveFailedSchemaCheckModalLoader2} />
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
          <Button variant="ghost" size="icon-sm" aria-label="About breaking changes">
            <InfoIcon className={styles.breakingChangesTitleInfoIcon} />
          </Button>
        }
        openOnHover
        align="start"
        width="xl"
        content={
          <div className={styles.breakingChangesTitleDiv}>
            <h5 className={styles.breakingChangesTitleH5}>Breaking Changes</h5>
            <p className={styles.breakingChangesTitleP}>
              Schema changes that can potentially break clients.
            </p>
            <h6 className={styles.breakingChangesTitleH6}>Breaking Change Approval</h6>
            <p className={styles.breakingChangesTitleP2}>
              Approve this schema check for adding the changes to the list of allowed changes and
              change the status of this schema check to successful.
            </p>
            <h6 className={styles.breakingChangesTitleH6}>Conditional Breaking Changes</h6>
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
        <Button variant="ghost" size="icon-sm" aria-label="About policy line numbers">
          <InfoIcon className={styles.policyInfoInfoIcon} />
        </Button>
      }
      openOnHover
      width="lg"
      content={
        <p className={styles.policyInfoP}>
          Schema policy checks run on the composed API schema. Line numbers reflect that and will
          not match the lines from the source schema.
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
      <ChangesTitle>
        {props.title}
        <PolicyInfo />
      </ChangesTitle>
      <ul className={styles.policyBlockUl}>
        {policies.edges.map((edge, key) => (
          <li
            key={key}
            className={cn(
              props.type === 'warning' ? shared.fg.warning : styles.policyBlockLi2,
              styles.policyBlockLi3,
            )}
          >
            <span className={styles.policyBlockSpan}>
              {labelize(edge.node.message.replace(/\.$/, ''))}{' '}
            </span>
            {edge.node.start?.line ? (
              <span
                className={styles.policyBlockSpan2}
                onClick={() => props.goToline?.(edge.node.start?.line || undefined)}
              >
                on line {edge.node.start.line}
              </span>
            ) : null}
            <Popover
              trigger={
                <button type="button" aria-label="Which rule" className={styles.policyBlockButton}>
                  <CircleQuestionMarkIcon size={16} />
                </button>
              }
              openOnHover
              width="auto"
              content={
                <p className={styles.policyBlockP}>
                  rule: <span className={styles.policyBlockSpan3}>{edge.node.ruleId}</span>
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
      <div className={styles.conditionalBreakingChangesMetadataSectionDiv}>
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
    <div className={styles.conditionalBreakingChangesMetadataSectionDiv}>
      <p>
        Based on{' '}
        <span className={styles.conditionalBreakingChangesMetadataSectionSpan}>
          {schemaCheck.conditionalBreakingChangeMetadata.usage.totalRequestCountFormatted} requests
        </span>{' '}
        from target
        {numberOfTargets === 1 ? '' : 's'}{' '}
        {numberOfTargets <= 3 && (
          <>
            {allTargets.map((target, index) => (
              <Fragment key={target.slug}>
                <span className={styles.conditionalBreakingChangesMetadataSectionSpan2}>
                  {target.slug}
                </span>
                {index === allTargets.length - 1 ? null : ', '}
              </Fragment>
            ))}
          </>
        )}
        {numberOfTargets > 3 && (
          <>
            {truncatedTargets.map((target, index) => (
              <Fragment key={target.slug}>
                <span className={styles.conditionalBreakingChangesMetadataSectionSpan3}>
                  {target.slug}
                </span>
                {index === truncatedTargets.length - 1 ? null : ', '}
              </Fragment>
            ))}
            {' and '}
            <Popover
              trigger={<Button variant="link">{excludedTargets.length} more</Button>}
              content={
                <div className={styles.conditionalBreakingChangesMetadataSectionDiv2}>
                  <h4 className={styles.conditionalBreakingChangesMetadataSectionH4}>
                    All Targets
                  </h4>
                  <ScrollArea height="sm">
                    <div className={styles.conditionalBreakingChangesMetadataSectionDiv3}>
                      {allTargets.map((target, index) => (
                        <div
                          key={index}
                          className={styles.conditionalBreakingChangesMetadataSectionDiv4}
                        >
                          <div className={styles.conditionalBreakingChangesMetadataSectionDiv5}>
                            {target.slug}
                          </div>
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
        <span className={styles.conditionalBreakingChangesMetadataSectionSpan4}>
          {format(schemaCheck.conditionalBreakingChangeMetadata.period.from, 'do MMM yyyy HH:mm')}
        </span>{' '}
        to{' '}
        <span className={styles.conditionalBreakingChangesMetadataSectionSpan5}>
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

// Approving a check turns it from Failed into Successful. Keying on the typename starts the
// visited pages over, so they are read again with their approvals.
function changePagesKey(listId: string, schemaCheck: { __typename?: string }) {
  return `${listId}:${schemaCheck.__typename}`;
}

const DefaultSchemaView_SchemaCheckFragment = graphql(`
  fragment DefaultSchemaView_SchemaCheckFragment on SchemaCheck {
    __typename
    id
    serviceName
    hasSchemaCompositionErrors
    baseline {
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
    ... on FailedSchemaCheck {
      compositionErrors {
        ...CompositionErrorsSection_SchemaErrorConnection
      }
    }
    hasSchemaChanges
    breakingSchemaChanges(first: 300) {
      totalCount
      edges {
        node {
          ...ChangesBlock_SchemaChangeWithUsageFragment
        }
      }
    }
    safeSchemaChangeGroups {
      ...PagedChanges_SafeChangeGroupFragment
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

/** The tabs of one view under the contract picker, and which of them is open. */
type CheckView = {
  items: TabbedViewItem[];
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * The default graph's tabs. A hook rather than a component so the page renders one TabbedView
 * whichever graph is picked: switching the picker between the default graph and a contract
 * then swaps the tabs, not the band the picker sits in, and the picker keeps focus.
 */
function useDefaultSchemaView(props: {
  schemaCheck: FragmentType<typeof DefaultSchemaView_SchemaCheckFragment>;
  projectType: ProjectType;
}): CheckView {
  const [selectedView, setSelectedView] = useState<string>('details');
  const checkFragment = useFragment(DefaultSchemaView_SchemaCheckFragment, props.schemaCheck);
  const sdl = useCheckSdl({
    schemaCheckId: checkFragment.id,
    pause: !SDL_TABS.has(selectedView),
  });
  const schemaCheck = withCheckSdl(checkFragment, sdl.data);
  const changePages = useChangePageLoaders({ schemaCheckId: schemaCheck.id });
  const [scrollToLine, setScrollToLine] = useState<number | undefined>();

  const items: TabbedViewItem[] = [
    {
      value: 'details',
      label: 'Details',
      icon: ListIcon,
      attrs: { 'data-testid': 'details-view-btn' },
      content: (
        <div className={styles.useDefaultSchemaViewDiv}>
          {!schemaCheck.schemaPolicyWarnings?.edges?.length &&
            !schemaCheck.hasSchemaChanges &&
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
          {schemaCheck.breakingSchemaChanges?.totalCount ? (
            <div className={styles.useDefaultSchemaViewDiv2}>
              <PagedBreakingChanges
                schemaCheckId={schemaCheck.id}
                title={<BreakingChangesTitle />}
                firstPage={schemaCheck.breakingSchemaChanges.edges.map(edge => edge.node)}
                totalCount={schemaCheck.breakingSchemaChanges.totalCount}
                loadPage={changePages.loadBreakingPage}
                resetKey={changePagesKey(schemaCheck.id, schemaCheck)}
                conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
              />
            </div>
          ) : null}
          {schemaCheck.safeSchemaChangeGroups.length ? (
            <div className={styles.useDefaultSchemaViewDiv2}>
              <SafeChangeGroups
                schemaCheckId={schemaCheck.id}
                groups={schemaCheck.safeSchemaChangeGroups}
                loadPage={changePages.loadSafePage}
                resetKey={changePagesKey(schemaCheck.id, schemaCheck)}
              />
            </div>
          ) : null}
          {schemaCheck.schemaPolicyErrors?.edges.length ? (
            <div className={styles.useDefaultSchemaViewDiv2}>
              <PolicyBlock
                title="Schema Policy Errors"
                policies={schemaCheck.schemaPolicyErrors}
                type="error"
              />
            </div>
          ) : null}
          {schemaCheck.schemaPolicyWarnings?.edges.length ? (
            <div className={styles.useDefaultSchemaViewDiv2}>
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
      icon: FileDiffIcon,
      attrs: { 'data-testid': 'service-view-btn' },
      content:
        schemaCheck.baseline?.sdl === schemaCheck.schemaSDL ? (
          <SDLSingleView
            sdl={schemaCheck.schemaSDL}
            downloadFileName="service.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className={styles.useDefaultSchemaViewSpan}>
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span
                        className={styles.useDefaultSchemaViewSpan2}
                        data-testid="schema-title-before"
                      >
                        {schemaCheck.serviceName}@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className={styles.useDefaultSchemaViewArrowRight} />
                    </>
                  ) : null}
                  <span className={styles.useDefaultSchemaViewSpan2} data-testid="schema-title">
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
                <span className={styles.useDefaultSchemaViewSpan}>
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className={styles.useDefaultSchemaViewSpan2}>
                        {schemaCheck.serviceName}@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className={styles.useDefaultSchemaViewArrowRight} />
                    </>
                  ) : null}
                  <span className={styles.useDefaultSchemaViewSpan2}>
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
    icon: FileDiffIcon,
    attrs: { 'data-testid': 'schema-view-btn' },
    disabled: schemaCheck.hasSchemaCompositionErrors,
    tooltip: schemaCheck.hasSchemaCompositionErrors
      ? 'Composition did not succeed. No public schema SDL available.'
      : undefined,
    content:
      schemaCheck.baseline?.publicSdl === schemaCheck.compositeSchemaSDL ? (
        <SDLSingleView
          sdl={schemaCheck.compositeSchemaSDL ?? ''}
          downloadFileName="schema.graphqls"
          title={
            schemaCheck.serviceName ? (
              <span className={styles.useDefaultSchemaViewSpan}>
                {schemaCheck.baseline?.meta ? (
                  <>
                    <span
                      className={styles.useDefaultSchemaViewSpan2}
                      data-testid="schema-title-before"
                    >
                      schema@
                      {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                    </span>
                    <ArrowRight className={styles.useDefaultSchemaViewArrowRight} />
                  </>
                ) : null}
                <span className={styles.useDefaultSchemaViewSpan2} data-testid="schema-title">
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
          sorted
        />
      ),
  });

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      label: 'Supergraph',
      icon: FileDiffIcon,
      attrs: { 'data-testid': 'supergraph-view-btn' },
      disabled: schemaCheck.hasSchemaCompositionErrors,
      tooltip: schemaCheck.hasSchemaCompositionErrors
        ? 'Composition did not succeed. No Supergraph available.'
        : undefined,
      content:
        schemaCheck?.baseline?.supergraphSdl === schemaCheck.supergraphSDL ? (
          <SDLSingleView
            sdl={schemaCheck?.baseline?.supergraphSdl ?? ''}
            downloadFileName="supergraph.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className={styles.useDefaultSchemaViewSpan}>
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span
                        className={styles.useDefaultSchemaViewSpan2}
                        data-testid="schema-title-before"
                      >
                        supergraph@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className={styles.useDefaultSchemaViewArrowRight} />
                    </>
                  ) : null}
                  <span className={styles.useDefaultSchemaViewSpan2} data-testid="schema-title">
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
            sorted
          />
        ),
    });
  }

  items.push({
    value: 'policy',
    label: 'Policy',
    icon: ScaleIcon,
    attrs: { 'data-testid': 'policy-view-btn' },
    disabled:
      !schemaCheck.schemaPolicyWarnings?.edges.length &&
      !(
        schemaCheck.__typename === 'FailedSchemaCheck' &&
        schemaCheck.schemaPolicyErrors?.edges?.length
      ),
    content: (
      <>
        <div className={styles.useDefaultSchemaViewDiv3}>
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

  return {
    items: items.map(item => withSdlState(item, sdl, missingSdlMessage)),
    value: selectedView,
    onValueChange: value => {
      setScrollToLine(undefined);
      setSelectedView(value);
    },
  };
}

function missingSdlMessage(
  data: { compositeSchemaSDL?: string | null; supergraphSDL?: string | null },
  tab: string,
) {
  if (tab === 'schema' && !data.compositeSchemaSDL) {
    return 'Composition did not succeed. No public schema SDL available.';
  }
  if (tab === 'supergraph' && !data.supergraphSDL) {
    return 'Composition did not succeed. No Supergraph available.';
  }
  return null;
}

const ContractCheckView_ContractCheckFragment = graphql(`
  fragment ContractCheckView_ContractCheckFragment on ContractCheck {
    id
    schemaCompositionErrors {
      ...CompositionErrorsSection_SchemaErrorConnection
    }
    hasSchemaChanges
    breakingSchemaChanges(first: 300) {
      totalCount
      edges {
        node {
          ...ChangesBlock_SchemaChangeWithUsageFragment
        }
      }
    }
    safeSchemaChangeGroups {
      ...PagedChanges_SafeChangeGroupFragment
    }
    hasSchemaCompositionErrors
    baseline {
      compositionErrors {
        message
      }
    }
  }
`);

const ContractCheckView_SchemaCheckFragment = graphql(`
  fragment ContractCheckView_SchemaCheckFragment on SchemaCheck {
    __typename
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

/** The picked contract's tabs, or null while the default graph is picked. See useDefaultSchemaView. */
function useContractCheckView(props: {
  contractCheck: FragmentType<typeof ContractCheckView_ContractCheckFragment> | null;
  schemaCheck: FragmentType<typeof ContractCheckView_SchemaCheckFragment>;
  projectType: ProjectType;
}): CheckView | null {
  const contractFragment = useFragment(
    ContractCheckView_ContractCheckFragment,
    props.contractCheck,
  );
  const schemaCheck = useFragment(ContractCheckView_SchemaCheckFragment, props.schemaCheck);
  const changePages = useChangePageLoaders({
    schemaCheckId: schemaCheck.id,
    contractCheckId: contractFragment?.id,
  });

  // Another contract starts on Details again, since a view can be disabled on one and not the other.
  const [selectedView, setSelectedView] = useResetState<string>(
    () => 'details',
    [contractFragment?.id],
  );
  const sdl = useContractCheckSdl({
    schemaCheckId: schemaCheck.id,
    contractCheckId: contractFragment?.id,
    pause: !SDL_TABS.has(selectedView),
  });

  if (!contractFragment) {
    return null;
  }
  const contractCheck = withContractCheckSdl(contractFragment, sdl.data);

  const items: TabbedViewItem[] = [
    {
      value: 'details',
      label: 'Details',
      icon: ListIcon,
      content: (
        <div className={styles.useContractCheckViewDiv}>
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
          {contractCheck.breakingSchemaChanges?.totalCount ? (
            <div className={styles.useContractCheckViewDiv2}>
              <PagedBreakingChanges
                schemaCheckId={schemaCheck.id}
                title={<BreakingChangesTitle />}
                firstPage={contractCheck.breakingSchemaChanges.edges.map(edge => edge.node)}
                totalCount={contractCheck.breakingSchemaChanges.totalCount}
                loadPage={changePages.loadBreakingPage}
                resetKey={changePagesKey(contractCheck.id, schemaCheck)}
                conditionBreakingChangeMetadata={schemaCheck.conditionalBreakingChangeMetadata}
              />
            </div>
          ) : null}
          {contractCheck.safeSchemaChangeGroups.length ? (
            <div className={styles.useContractCheckViewDiv3}>
              <SafeChangeGroups
                schemaCheckId={schemaCheck.id}
                groups={contractCheck.safeSchemaChangeGroups}
                loadPage={changePages.loadSafePage}
                resetKey={changePagesKey(contractCheck.id, schemaCheck)}
              />
            </div>
          ) : null}
          {!contractCheck.hasSchemaChanges &&
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
      icon: FileDiffIcon,
      disabled: contractCheck.hasSchemaCompositionErrors,
      tooltip: contractCheck.hasSchemaCompositionErrors
        ? 'Composition did not succeed. No public schema SDL available.'
        : undefined,
      content:
        contractCheck?.baseline?.publicSdl === contractCheck.compositeSchemaSDL ? (
          <SDLSingleView
            sdl={contractCheck.compositeSchemaSDL ?? ''}
            downloadFileName="schema.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className={styles.useContractCheckViewSpan}>
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className={styles.useContractCheckViewSpan2}>
                        schema@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className={styles.useContractCheckViewArrowRight} />
                    </>
                  ) : null}
                  <span className={styles.useContractCheckViewSpan3}>
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
            sorted
          />
        ),
    },
  ];

  if (props.projectType === ProjectType.Federation) {
    items.push({
      value: 'supergraph',
      label: 'Supergraph',
      icon: FileDiffIcon,
      disabled: contractCheck.hasSchemaCompositionErrors,
      tooltip: contractCheck.hasSchemaCompositionErrors
        ? 'Composition did not succeed. No Supergraph available.'
        : undefined,
      content:
        contractCheck?.baseline?.supergraphSdl === contractCheck?.supergraphSDL ? (
          <SDLSingleView
            sdl={contractCheck?.supergraphSDL ?? ''}
            downloadFileName="supergraph.graphqls"
            title={
              schemaCheck.serviceName ? (
                <span className={styles.useContractCheckViewSpan4}>
                  {schemaCheck.baseline?.meta ? (
                    <>
                      <span className={styles.useContractCheckViewSpan5}>
                        supergraph@
                        {schemaCheck.baseline?.meta.commit?.substring(0, 7) ?? 'unknown'}
                      </span>
                      <ArrowRight className={styles.useContractCheckViewArrowRight2} />
                    </>
                  ) : null}
                  <span className={styles.useContractCheckViewSpan6}>
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
            sorted
          />
        ),
    });
  }

  return {
    items: items.map(item => withSdlState(item, sdl, missingSdlMessage)),
    value: selectedView,
    onValueChange: setSelectedView,
  };
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
    schemaPolicyErrors {
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
          contractName
          hasSchemaCompositionErrors
          hasUnapprovedBreakingChanges
          hasSchemaChanges
          schemaCompositionErrors {
            edges {
              node {
                message
              }
            }
          }
          unapprovedBreakingSchemaChangeCount
          baseline {
            compositionErrors {
              message
            }
          }
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

  const [selectedItem, setSelectedItem] = useResetState<string>(() => 'default', [schemaCheck.id]);
  const selectedContractCheckNode = useMemo(
    () =>
      schemaCheck.contractChecks?.edges?.find(edge => edge.node.id === selectedItem)?.node ?? null,
    [selectedItem, schemaCheck],
  );

  const contractChecks = schemaCheck.contractChecks?.edges ?? [];
  // Without contracts there is nothing to pick, but the default graph keeps its status glyph.
  const contractPicker = !contractChecks.length ? (
    <span className={styles.schemaChecksViewSpan}>
      {checkStatusIcon(schemaCheck, 'Schema changed')}
      Default Graph
    </span>
  ) : (
    <Select
      aria-label="Contract"
      value={selectedItem}
      onValueChange={setSelectedItem}
      label={
        <span className={shared.inlineRow.gap1_5}>
          {selectedContractCheckNode
            ? checkStatus(selectedContractCheckNode, 'Contract schema changed').icon
            : checkStatus(schemaCheck, 'Schema changed').icon}
          {selectedContractCheckNode?.contractName ?? 'Default Graph'}
        </span>
      }
      options={[
        {
          value: 'default',
          label: 'Default Graph',
          trailing: checkStatusTrailing(schemaCheck, 'Schema changed'),
        },
        ...contractChecks.map(edge => ({
          value: edge.node.id,
          label: edge.node.contractName,
          trailing: checkStatusTrailing(edge.node, 'Contract schema changed'),
        })),
      ]}
      size="compact"
      width="auto"
    />
  );

  const failures = contractChecks.flatMap(edge => {
    const failure = contractFailure(edge.node);
    return failure
      ? [
          {
            key: edge.node.id,
            label: edge.node.contractName,
            ...failure,
            onView: () => setSelectedItem(edge.node.id),
          },
        ]
      : [];
  });

  const defaultView = useDefaultSchemaView({
    schemaCheck,
    projectType: props.projectType,
  });
  const contractView = useContractCheckView({
    contractCheck: selectedContractCheckNode,
    schemaCheck,
    projectType: props.projectType,
  });
  const active = contractView ?? defaultView;
  // The picker opens on the default graph, so a contract that failed is named here first.
  return (
    <div className={styles.schemaChecksViewDiv}>
      {failures.length ? (
        <div className={styles.schemaChecksViewDiv2}>
          <ContractFailuresTable
            title={`${failures.length} of ${contractChecks.length} contracts failed`}
            aside={`${contractChecks.length - failures.length} passed`}
            items={failures}
          />
        </div>
      ) : null}
      <ScopeBar picker={contractPicker} />
      <TabbedView
        items={active.items}
        value={active.value}
        onValueChange={active.onValueChange}
        bodyPadding="none"
      />
    </div>
  );
}

/**
 * Why a contract check failed, in the CLI's words, with how much it found. A contract fails to
 * compose or fails its diff, never both: no diff runs after a composition failure. A baseline that
 * failed to compose sets neither flag, so it is the third case.
 */
function contractFailure(check: {
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  schemaCompositionErrors: { edges: ReadonlyArray<unknown> } | null;
  unapprovedBreakingSchemaChangeCount: number;
  baseline: { compositionErrors: ReadonlyArray<unknown> | null } | null;
}): { reason: string; detail?: string } | null {
  if (check.hasSchemaCompositionErrors) {
    const count = check.schemaCompositionErrors?.edges.length ?? 0;
    return {
      reason: 'Composition failed.',
      detail: count ? formatCount(count, 'error') : undefined,
    };
  }
  if (check.hasUnapprovedBreakingChanges) {
    const count = check.unapprovedBreakingSchemaChangeCount;
    return {
      reason: 'Unapproved breaking changes!',
      detail: count ? formatCount(count, 'breaking change') : undefined,
    };
  }
  const baselineErrors = check.baseline?.compositionErrors?.length ?? 0;
  if (baselineErrors) {
    return { reason: 'Baseline composition failed.', detail: formatCount(baselineErrors, 'error') };
  }
  return null;
}

type CheckStatusFlags = {
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  hasSchemaChanges: boolean;
  /** Only a contract check has one; a failed baseline sets neither flag above. */
  baseline?: { compositionErrors: ReadonlyArray<unknown> | null } | null;
  /** Only the default graph runs the policy. */
  schemaPolicyErrors?: { edges: ReadonlyArray<unknown> } | null;
};

/** The glyph and the words for a check's outcome; the trigger takes the glyph, the list both. */
function checkStatus(check: CheckStatusFlags, changedLabel: string) {
  if (check.hasSchemaCompositionErrors) {
    return {
      icon: <TriangleAlertIcon className={styles.checkStatusTriangleAlertIcon} />,
      label: 'Composition failed.',
      state: 'Failed',
    };
  }
  if (check.hasUnapprovedBreakingChanges) {
    return {
      icon: <TriangleAlertIcon className={styles.checkStatusTriangleAlertIcon} />,
      label: 'Unapproved breaking changes!',
      state: 'Failed',
    };
  }
  if (check.schemaPolicyErrors?.edges.length) {
    return {
      icon: <TriangleAlertIcon className={styles.checkStatusTriangleAlertIcon} />,
      label: 'Schema policy errors.',
    };
  }
  if (check.baseline?.compositionErrors?.length) {
    return {
      icon: <TriangleAlertIcon className={styles.checkStatusTriangleAlertIcon} />,
      label: 'Baseline composition failed.',
      state: 'Failed',
    };
  }
  if (check.hasSchemaChanges) {
    return {
      icon: <GitCompareIcon className={styles.checkStatusGitCompareIcon} />,
      label: changedLabel,
      state: 'Schema changed',
    };
  }
  return {
    icon: <CheckIcon className={styles.checkStatusCheckIcon} />,
    label: 'Composition succeeded.',
    state: 'No changes',
  };
}

function checkStatusIcon(check: CheckStatusFlags, changedLabel: string) {
  const status = checkStatus(check, changedLabel);
  return <StatusTooltip icon={status.icon} label={status.label} />;
}

/** A picker row's status: glyph and state in words, the reason on hover. */
function checkStatusTrailing(check: CheckStatusFlags, changedLabel: string) {
  const status = checkStatus(check, changedLabel);
  return (
    <StatusTooltip
      icon={
        <span className={styles.checkStatusTrailingSpan}>
          {status.icon}
          {status.state}
        </span>
      }
      label={status.label}
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
    hasSchemaCompositionErrors
    unapprovedBreakingSchemaChangeCount
    schemaPolicyErrors {
      edges {
        node {
          message
        }
      }
    }
    ...SchemaCheckView_SchemaCheckFragment
  }
`);

export const ActiveSchemaCheckQuery = graphql(`
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

/** What made a check fail, in the order the page lists them. */
function failureReasons(check: {
  hasSchemaCompositionErrors: boolean;
  unapprovedBreakingSchemaChangeCount: number;
  schemaPolicyErrors: { edges: ReadonlyArray<unknown> } | null;
  contractChecks: { edges: ReadonlyArray<{ node: { isSuccess: boolean } }> } | null;
}) {
  const unapproved = check.unapprovedBreakingSchemaChangeCount;
  const policyErrors = check.schemaPolicyErrors?.edges.length ?? 0;
  const failedContracts =
    check.contractChecks?.edges.filter(edge => !edge.node.isSuccess).length ?? 0;
  return [
    check.hasSchemaCompositionErrors ? 'Composition failed' : null,
    unapproved ? formatCount(unapproved, 'unapproved breaking change') : null,
    policyErrors ? formatCount(policyErrors, 'schema policy error') : null,
    failedContracts ? formatCount(failedContracts, 'contract') + ' failed' : null,
  ].filter((reason): reason is string => reason !== null);
}

const ActiveSchemaCheck = (props: { schemaCheckId: string | null }): React.ReactElement | null => {
  const { schemaCheckId } = props;
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: ActiveSchemaCheckQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
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
      <div className={styles.activeSchemaCheckDiv}>
        <div className={styles.activeSchemaCheckDiv2}>
          <span className={styles.activeSchemaCheckSpan}>
            <Spinner variants={{ size: 'lg' }} />
          </span>
          Loading Schema Check...
        </div>
      </div>
    );
  }

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (!schemaCheck || !query.data?.project) {
    return (
      <EmptyList
        className={styles.activeSchemaCheckEmptyList}
        title="Check not found"
        description="Learn how to check your schema with Hive CLI"
        docsUrl="/schema-registry#check-a-schema"
      />
    );
  }

  const reasons = failureReasons(schemaCheck);

  return (
    <div className={styles.activeSchemaCheckDiv3}>
      <div className={styles.activeSchemaCheckDiv4}>
        <Title>Check {schemaCheck.id}</Title>
        <Subtitle>Detailed view of the schema check</Subtitle>
      </div>
      <div className={styles.activeSchemaCheckDiv5}>
        <div className={styles.activeSchemaCheckDiv6}>
          <div className={shared.fillShrinkable}>
            <DescriptionList
              variants={{ termStyle: 'title', columns: 'auto' }}
              rows={[
                {
                  items: [
                    {
                      term: 'Status',
                      description:
                        schemaCheck.__typename === 'FailedSchemaCheck' ? (
                          <>
                            <span className={styles.activeSchemaCheckSpan2}>Failed</span>
                            {reasons.length ? (
                              <span className={styles.activeSchemaCheckSpan3}>
                                {reasons.join(' · ')}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          'Passed'
                        ),
                    },
                    ...(schemaCheck.serviceName
                      ? [
                          {
                            term: 'Service',
                            description: (
                              <ServiceFilterButton serviceName={schemaCheck.serviceName} />
                            ),
                          },
                        ]
                      : []),
                    {
                      term: 'Triggered',
                      description: (
                        <>
                          <TimeAgo date={schemaCheck.createdAt} />
                          {schemaCheck.meta?.author ? <> by {schemaCheck.meta.author}</> : null}
                        </>
                      ),
                    },
                    ...(schemaCheck.meta?.commit
                      ? [
                          {
                            term: 'Commit',
                            description: (
                              <CopyText>
                                <span title={schemaCheck.meta.commit}>
                                  {schemaCheck.meta.commit}
                                </span>
                              </CopyText>
                            ),
                          },
                        ]
                      : []),
                    ...(schemaCheck.contextId
                      ? [
                          {
                            term: 'Context ID',
                            description: (
                              <CopyText>
                                <span title={schemaCheck.contextId}>{schemaCheck.contextId}</span>
                              </CopyText>
                            ),
                          },
                        ]
                      : []),
                  ],
                },
              ]}
            />
          </div>
          {schemaCheck.__typename === 'FailedSchemaCheck' && schemaCheck.canBeApproved ? (
            <div className={shared.noShrink}>
              {schemaCheck.canBeApprovedByViewer ? (
                <Popover
                  open={approvalOpen}
                  onOpenChange={setApprovalOpen}
                  trigger={
                    <Button variant="destructive" disabled={approvalOpen}>
                      Approve{' '}
                      {approvalOpen ? (
                        <ChevronUp className={styles.activeSchemaCheckChevronUp} />
                      ) : (
                        <ChevronDown className={styles.activeSchemaCheckChevronDown} />
                      )}
                    </Button>
                  }
                  width="lg"
                  align="end"
                  arrow
                  content={
                    <ApproveFailedSchemaCheckModal
                      onClose={() => setApprovalOpen(false)}
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
          <div className={styles.activeSchemaCheckDiv4}>
            <div className={styles.activeSchemaCheckDiv9}>
              <div>
                <Tooltip
                  trigger={
                    <span className={styles.activeSchemaCheckSpan4}>
                      <BadgeCheck className={styles.activeSchemaCheckBadgeCheck} />
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
                <p className={styles.activeSchemaCheckP}>
                  {schemaCheck.approvedBy?.displayName ??
                    schemaCheck.cliApprovalMetadata?.displayName ??
                    'unknown'}
                </p>
                <p className={styles.activeSchemaCheckP2}>
                  {schemaCheck.approvedBy?.email ??
                    schemaCheck.cliApprovalMetadata?.email ??
                    'unknown'}
                </p>
              </div>
              {schemaCheck.approvalComment ? (
                <div className={styles.activeSchemaCheckDiv10}>
                  <span>„ </span>
                  {schemaCheck.approvalComment}
                  <span> ”</span>
                </div>
              ) : (
                <div className={styles.activeSchemaCheckDiv11}>
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

export function TargetChecksSinglePage(props: { schemaCheckId: string }) {
  return (
    <>
      <Meta title={`Schema check ${props.schemaCheckId}`} />
      <ActiveSchemaCheck schemaCheckId={props.schemaCheckId} />
    </>
  );
}
