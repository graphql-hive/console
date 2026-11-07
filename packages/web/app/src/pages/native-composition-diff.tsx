import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { CompositionErrorMessage } from '@/components/target/history/composition-error-message';
import { DiffEditor } from '@/components/ui/diff-editor';
import { Heading } from '@/components/ui/heading';
import { PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { Button } from '@/components/ui/primitives/button/button';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';
import { Tabs } from '@/components/ui/primitives/tabs/tabs';
import { graphql } from '@/gql';
import { NativeFederationCompatibilityStatusType } from '@/gql/graphql';
import { useClipboard } from '@/lib/hooks';
import { useTimed } from '@/lib/hooks/use-timed';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { nativeCompositionDiffStyles } from './native-composition-diff.css';

type NativeCompositionDiffProps = {
  projectId: string;
};

const NativeCompositionDiff_NativeCompositionDiffQuery = graphql(/* GraphQL */ `
  query NativeCompositionDiff_NativeCompositionDiffQuery($projectId: ID!) {
    project(reference: { byId: $projectId }) {
      id
      slug
      nativeFederationCompatibility {
        status
        results {
          target {
            id
            slug
          }
          currentSupergraphSdl
          nativeCompositionResult {
            duration
            supergraphSdl
            errors {
              edges {
                node {
                  message
                }
              }
            }
          }
          schemaVersion {
            id
            schemas {
              edges {
                node {
                  ... on CompositeSchema {
                    id
                    service
                    source
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export function NativeCompositionDiff(props: NativeCompositionDiffProps): ReactNode | null {
  const [result] = useQuery({
    query: NativeCompositionDiff_NativeCompositionDiffQuery,
    variables: {
      projectId: props.projectId,
    },
  });
  const [page, setPage] = useState(0);

  const clipboard = useClipboard();
  const [copied, setCopied] = useTimed(5000);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const project = result.data?.project;
  const nativeFederationCompatibility = project?.nativeFederationCompatibility;

  const results = useMemo(() => {
    return (
      nativeFederationCompatibility?.results.map(r => ({
        ...r,
        compatible: r?.currentSupergraphSdl === r?.nativeCompositionResult?.supergraphSdl,
      })) ?? []
    );
  }, [project?.nativeFederationCompatibility?.results]);

  if (!nativeFederationCompatibility) {
    return null;
  }

  const report = results[page];

  const statusColor = (
    {
      [NativeFederationCompatibilityStatusType.Compatible]: 'success',
      [NativeFederationCompatibilityStatusType.Incompatible]: 'critical',
      [NativeFederationCompatibilityStatusType.Unknown]: 'neutral',
      [NativeFederationCompatibilityStatusType.NotApplicable]: 'info',
    } as const
  )[nativeFederationCompatibility.status];

  return (
    <div className={nativeCompositionDiffStyles.root}>
      <Heading className={nativeCompositionDiffStyles.heading}>Native Composition Report</Heading>

      <div className={nativeCompositionDiffStyles.meta}>
        <MetaCell label="Project" className={nativeCompositionDiffStyles.metaProject}>
          {project.slug}
        </MetaCell>
        <MetaCell label="Status" className={nativeCompositionDiffStyles.metaStatus}>
          <StatusDot color={statusColor} />

          <span className={nativeCompositionDiffStyles.metaStatusText}>
            {nativeFederationCompatibility.status}
          </span>
        </MetaCell>
        <div className={nativeCompositionDiffStyles.metaSpacer} />
      </div>
      <PageLayout>
        <div className={nativeCompositionDiffStyles.metaAction}>
          <div className={nativeCompositionDiffStyles.metaActionLabel}>View Target</div>
          <Tabs
            orientation="vertical"
            value={String(page)}
            onValueChange={value => setPage(Number(value))}
            items={results.map((result, index) => ({
              value: String(index),
              label: (
                <span className={shared.row.base}>
                  <StatusDot color={result?.compatible ? 'success' : 'critical'} />
                  <span className={nativeCompositionDiffStyles.targetName}>
                    {result?.target?.slug ?? `Target ${index}`}
                  </span>
                </span>
              ),
            }))}
          />
        </div>
        <PageLayoutContent>
          {report?.nativeCompositionResult?.errors?.edges?.length ? (
            <>
              <div className={nativeCompositionDiffStyles.errorsTitle}>Composition Errors</div>
              <ul className={nativeCompositionDiffStyles.errors}>
                {report?.nativeCompositionResult?.errors?.edges?.map((err, idx) => (
                  <li key={idx} className={nativeCompositionDiffStyles.error}>
                    <span className={nativeCompositionDiffStyles.errorIndex}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    <CompositionErrorMessage message={err.node.message} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className={nativeCompositionDiffStyles.comparison}>
            <div className={nativeCompositionDiffStyles.diff}>
              <div className={nativeCompositionDiffStyles.diffTitle}>Schema Comparison</div>
              {report?.currentSupergraphSdl === report?.nativeCompositionResult?.supergraphSdl ? (
                <div className={shared.fullWidth}>
                  {report?.schemaVersion?.schemas.edges.length ? (
                    <>
                      The generated supergraph SDL from your existing composition setup and our{' '}
                      <a
                        className={nativeCompositionDiffStyles.diffLink}
                        href="https://github.com/the-guild-org/federation"
                      >
                        Open Source composition library
                      </a>{' '}
                      matches for this target.
                    </>
                  ) : (
                    <>This target has no services published.</>
                  )}
                  {nativeFederationCompatibility.status ===
                  NativeFederationCompatibilityStatusType.Compatible ? (
                    <div className={nativeCompositionDiffStyles.diffIntro}>
                      Review other targets to identify the cause of incompatibility
                    </div>
                  ) : null}
                  <div className={nativeCompositionDiffStyles.diffNote}>
                    <Button
                      variant="link"
                      anchor={{
                        href: 'https://github.com/the-guild-org/federation?tab=readme-ov-file#compatibility',
                      }}
                    >
                      Learn more about risks and compatibility with other composition libraries
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={shared.fullWidth}>
                  <span className={shared.weight.semibold}>
                    There are differences in the generated supergraph SDL
                  </span>{' '}
                  between your existing composition setup and native composition. Review these
                  changes carefully to determine how they could impact your gateway.
                  <div className={nativeCompositionDiffStyles.diffEditor}>
                    <DiffEditor
                      before={report?.currentSupergraphSdl ?? ''}
                      downloadFileName={`latest_composable_supergraph_${report.target?.id ?? 'target'}.graphql`}
                      after={report?.nativeCompositionResult?.supergraphSdl ?? null}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={nativeCompositionDiffStyles.summary}>
              <Tooltip
                // show only for disabled buttons
                open={!report?.schemaVersion?.schemas.edges.length && isTooltipOpen}
                onOpenChange={setIsTooltipOpen}
                maxWidth="screen"
                trigger={
                  <span className={nativeCompositionDiffStyles.summaryValue}>
                    <Button
                      width="full"
                      variant="outline"
                      disabled={!report?.schemaVersion?.schemas.edges.length}
                      onClick={async () => {
                        const services = report?.schemaVersion?.schemas?.edges?.map(edge => ({
                          sdl: (edge.node as any).source,
                          name: (edge.node as any).service,
                        }));

                        if (services) {
                          await clipboard(JSON.stringify(services, null, 2));
                          setCopied();
                        }
                      }}
                    >
                      {copied ? (
                        <CheckIcon className={nativeCompositionDiffStyles.copyIcon} />
                      ) : (
                        <CopyIcon className={nativeCompositionDiffStyles.copyIcon} />
                      )}{' '}
                      Copy services JSON
                    </Button>
                  </span>
                }
                content={
                  <span className={nativeCompositionDiffStyles.summaryError}>
                    <XIcon className={nativeCompositionDiffStyles.summaryErrorIcon} />{' '}
                    <span>
                      Cannot copy services JSON because there are no services published for this
                      target.
                    </span>
                  </span>
                }
              />
              <DescriptionList
                rows={[
                  {
                    items: [
                      {
                        term: 'Services',
                        description: report?.schemaVersion?.schemas?.edges?.length ?? 0,
                      },
                      {
                        term: 'Composition Errors',
                        description: report?.nativeCompositionResult?.errors?.edges.length ?? 0,
                      },
                      {
                        term: 'Composition Duration',
                        description: `${report?.nativeCompositionResult?.duration ?? 0}ms`,
                        mono: true,
                      },
                    ],
                  },
                ]}
              />
            </div>
          </div>
        </PageLayoutContent>
      </PageLayout>
    </div>
  );
}

function MetaCell(props: { label: string; children: ReactNode; className?: string }): ReactElement {
  return (
    <div className={cn(nativeCompositionDiffStyles.cell, props.className)}>
      <div className={nativeCompositionDiffStyles.cellLabel}>{props.label}</div>
      <div className={nativeCompositionDiffStyles.cellValue}>{props.children}</div>
    </div>
  );
}
