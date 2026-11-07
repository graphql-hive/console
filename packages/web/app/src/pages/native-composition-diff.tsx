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
import * as styles from './native-composition-diff.css';

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
    <div className={styles.nativeCompositionDiffDiv}>
      <Heading className={styles.nativeCompositionDiffHeading}>Native Composition Report</Heading>

      <div className={styles.nativeCompositionDiffDiv2}>
        <MetaCell label="Project" className={styles.nativeCompositionDiffMetaCell}>
          {project.slug}
        </MetaCell>
        <MetaCell label="Status" className={styles.nativeCompositionDiffMetaCell2}>
          <StatusDot color={statusColor} />

          <span className={styles.nativeCompositionDiffSpan}>
            {nativeFederationCompatibility.status}
          </span>
        </MetaCell>
        <div className={styles.nativeCompositionDiffDiv3} />
      </div>
      <PageLayout>
        <div className={styles.nativeCompositionDiffDiv4}>
          <div className={styles.nativeCompositionDiffDiv5}>View Target</div>
          <Tabs
            orientation="vertical"
            value={String(page)}
            onValueChange={value => setPage(Number(value))}
            items={results.map((result, index) => ({
              value: String(index),
              label: (
                <span className={shared.row.base}>
                  <StatusDot color={result?.compatible ? 'success' : 'critical'} />
                  <span className={styles.nativeCompositionDiffSpan3}>
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
              <div className={styles.nativeCompositionDiffDiv6}>Composition Errors</div>
              <ul className={styles.nativeCompositionDiffUl}>
                {report?.nativeCompositionResult?.errors?.edges?.map((err, idx) => (
                  <li key={idx} className={styles.nativeCompositionDiffLi}>
                    <span className={styles.nativeCompositionDiffSpan4}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    <CompositionErrorMessage message={err.node.message} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className={styles.nativeCompositionDiffDiv7}>
            <div className={styles.nativeCompositionDiffDiv8}>
              <div className={styles.nativeCompositionDiffDiv9}>Schema Comparison</div>
              {report?.currentSupergraphSdl === report?.nativeCompositionResult?.supergraphSdl ? (
                <div className={shared.fullWidth}>
                  {report?.schemaVersion?.schemas.edges.length ? (
                    <>
                      The generated supergraph SDL from your existing composition setup and our{' '}
                      <a
                        className={styles.nativeCompositionDiffA}
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
                    <div className={styles.nativeCompositionDiffDiv11}>
                      Review other targets to identify the cause of incompatibility
                    </div>
                  ) : null}
                  <div className={styles.nativeCompositionDiffDiv12}>
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
                  <div className={styles.nativeCompositionDiffDiv14}>
                    <DiffEditor
                      before={report?.currentSupergraphSdl ?? ''}
                      downloadFileName={`latest_composable_supergraph_${report.target?.id ?? 'target'}.graphql`}
                      after={report?.nativeCompositionResult?.supergraphSdl ?? null}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={styles.nativeCompositionDiffDiv15}>
              <Tooltip
                // show only for disabled buttons
                open={!report?.schemaVersion?.schemas.edges.length && isTooltipOpen}
                onOpenChange={setIsTooltipOpen}
                maxWidth="screen"
                trigger={
                  <span className={styles.nativeCompositionDiffSpan6}>
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
                        <CheckIcon className={styles.nativeCompositionDiffCheckIcon} />
                      ) : (
                        <CopyIcon className={styles.nativeCompositionDiffCopyIcon} />
                      )}{' '}
                      Copy services JSON
                    </Button>
                  </span>
                }
                content={
                  <span className={styles.nativeCompositionDiffSpan7}>
                    <XIcon className={styles.nativeCompositionDiffXIcon} />{' '}
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
    <div className={cn(styles.metaCellDiv, props.className)}>
      <div className={styles.metaCellDiv2}>{props.label}</div>
      <div className={styles.metaCellDiv3}>{props.children}</div>
    </div>
  );
}
