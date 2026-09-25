import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { DescriptionList } from '@/components/base/description-list/description-list';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { StatusDot } from '@/components/base/status-dot/status-dot';
import { Tabs } from '@/components/base/tabs/tabs';
import { Heading } from '@/components/ui/heading';
import { PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { DiffEditor } from '@/components/v2';
import { graphql } from '@/gql';
import { NativeFederationCompatibilityStatusType } from '@/gql/graphql';
import { useClipboard } from '@/lib/hooks';
import { useTimed } from '@/lib/hooks/use-timed';
import { cn } from '@/lib/utils';
import { CompositionError } from './target-history-schema-version';

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
    <div className="p-8">
      <Heading className="mb-4">Native Composition Report</Heading>

      <div className="border-neutral-5 dark:bg-neutral-3 flex items-center gap-4 rounded-sm border px-8 py-4 text-xs">
        <MetaCell label="Project" className="flex-1 truncate text-left">
          {project.slug}
        </MetaCell>
        <MetaCell label="Status" className="flex-1 items-center truncate text-left">
          <StatusDot color={statusColor} />

          <span className="ml-1 truncate">{nativeFederationCompatibility.status}</span>
        </MetaCell>
        <div className="col-span-2 flex-none text-right" />
      </div>
      <PageLayout>
        <div className="w-48 shrink-0">
          <div className="p-4 text-xs font-bold">View Target</div>
          <Tabs
            orientation="vertical"
            value={String(page)}
            onValueChange={value => setPage(Number(value))}
            items={results.map((result, index) => ({
              value: String(index),
              label: (
                <span className="flex items-center">
                  <StatusDot color={result?.compatible ? 'success' : 'critical'} />
                  <span className="ml-1">{result?.target?.slug ?? `Target ${index}`}</span>
                </span>
              ),
            }))}
          />
        </div>
        <PageLayoutContent>
          {report?.nativeCompositionResult?.errors?.edges?.length ? (
            <>
              <div className="py-3 text-lg font-bold">Composition Errors</div>
              <ul className="divide-neutral-4 divide-y px-1 pb-2">
                {report?.nativeCompositionResult?.errors?.edges?.map((err, idx) => (
                  <li key={idx} className="flex gap-3 px-4 py-3">
                    <span className="text-neutral-8 mt-0.5 w-6 shrink-0 select-none font-mono text-xs">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    <p className="text-neutral-12 flex flex-wrap items-baseline gap-y-1 text-sm">
                      <CompositionError message={err.node.message} />
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex w-full grow flex-col items-start">
              <div className="py-3 text-lg font-bold">Schema Comparison</div>
              {report?.currentSupergraphSdl === report?.nativeCompositionResult?.supergraphSdl ? (
                <div className="w-full">
                  {report?.schemaVersion?.schemas.edges.length ? (
                    <>
                      The generated supergraph SDL from your existing composition setup and our{' '}
                      <a
                        className="text-neutral-10 font-semibold underline-offset-4 hover:underline"
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
                    <div className="pt-2">
                      Review other targets to identify the cause of incompatibility
                    </div>
                  ) : null}
                  <div className="my-4">
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
                <div className="w-full">
                  <span className="font-semibold">
                    There are differences in the generated supergraph SDL
                  </span>{' '}
                  between your existing composition setup and native composition. Review these
                  changes carefully to determine how they could impact your gateway.
                  <div className="mt-4 min-h-full w-full">
                    <DiffEditor
                      before={report?.currentSupergraphSdl ?? ''}
                      downloadFileName={`latest_composable_supergraph_${report.target?.id ?? 'target'}.graphql`}
                      after={report?.nativeCompositionResult?.supergraphSdl ?? null}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex min-w-fit flex-col gap-4">
              <Tooltip
                // show only for disabled buttons
                open={!report?.schemaVersion?.schemas.edges.length && isTooltipOpen}
                onOpenChange={setIsTooltipOpen}
                maxWidth="screen"
                trigger={
                  <span className="inline-flex max-w-64 text-right">
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
                        <CheckIcon className="text-neutral-8 mr-2 size-4" />
                      ) : (
                        <CopyIcon className="text-neutral-8 mr-2 size-4" />
                      )}{' '}
                      Copy services JSON
                    </Button>
                  </span>
                }
                content={
                  <span className="flex items-center text-pretty">
                    <XIcon className="text-critical mr-1 size-4" />{' '}
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
    <div className={cn('min-w-0', props.className)}>
      <div className="text-xs font-bold capitalize">{props.label}</div>
      <div className="mt-1">{props.children}</div>
    </div>
  );
}
