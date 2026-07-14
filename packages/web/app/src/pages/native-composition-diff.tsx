import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { CopyIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { SubPageNavigationLink } from '@/components/navigation/sub-page-navigation-link';
import { BadgeRounded } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { NavLayout, PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
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
      [NativeFederationCompatibilityStatusType.Compatible]: 'green',
      [NativeFederationCompatibilityStatusType.Incompatible]: 'red',
      [NativeFederationCompatibilityStatusType.Unknown]: 'gray',
      [NativeFederationCompatibilityStatusType.NotApplicable]: 'info',
    } as const
  )[nativeFederationCompatibility.status];

  return (
    <div className="p-8">
      <Heading className="mb-4">Native Composition Report</Heading>

      <div className="border-neutral-5 dark:bg-neutral-3 flex flex-row items-center rounded-sm border px-8 py-4 text-[12px]">
        <MetaCell label="Project" className="w-32 flex-1">
          {project.slug}
        </MetaCell>
        <MetaCell label="Status" className="flex-1">
          <div className="flex items-center">
            <BadgeRounded color={statusColor} className="mx-0" />

            <span className="ml-1">{nativeFederationCompatibility.status}</span>
          </div>
        </MetaCell>
        <MetaCell label="Services" className="flex w-64 flex-col items-center justify-center">
          <div className="flex items-center">
            {report?.schemaVersion?.schemas?.edges?.length ?? 0}
          </div>
        </MetaCell>
        <MetaCell label="Composition Errors" className="flex flex-col items-center justify-center">
          <div className="flex items-center">
            {report?.nativeCompositionResult?.errors?.edges.length ?? 0}
          </div>
        </MetaCell>
        <div className="flex-none pl-8 text-right">
          <Button
            className="w-52 p-4"
            variant="outline"
            disabled={!report?.schemaVersion?.schemas.edges.length}
            onClick={async () => {
              const services = report?.schemaVersion?.schemas.edges.map(edge => ({
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
              <>Copied!</>
            ) : (
              <>
                <CopyIcon className="text-neutral-8 mr-2 size-4" /> Copy services JSON
              </>
            )}
          </Button>
        </div>
      </div>
      <PageLayout>
        <NavLayout>
          <div className="p-4 text-[12px] font-bold">View Target</div>
          {results.map((result, index) => (
            <SubPageNavigationLink
              key={index}
              isActive={page === index}
              onClick={() => setPage(index)}
              title={
                <div className="flex items-center">
                  <BadgeRounded color={result?.compatible ? 'green' : 'red'} className="mx-0" />
                  <span className="ml-1">{result?.target?.slug ?? `Target ${index}`}</span>
                </div>
              }
            />
          ))}
        </NavLayout>
        <PageLayoutContent>
          {report.nativeCompositionResult?.errors?.edges.length ? (
            <>
              <div className="py-3 text-lg font-bold">Composition Errors</div>
              <ul className="divide-neutral-4 divide-y px-1 pb-2">
                {report.nativeCompositionResult?.errors.edges.map((err, idx) => (
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
          <div className="py-3 text-lg font-bold">Schema Comparison</div>
          {report?.currentSupergraphSdl === report?.nativeCompositionResult?.supergraphSdl ? (
            <div>
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
              <Button variant="link" className="p-0" asChild>
                <a href="https://github.com/the-guild-org/federation?tab=readme-ov-file#compatibility">
                  Learn more about risks and compatibility with other composition libraries
                </a>
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4">
                <span className="font-semibold">
                  There are differences in the generated supergraph SDL
                </span>{' '}
                between your existing composition setup and native composition. Review these changes
                carefully to determine how they could impact your gateway.
              </div>
              <div className="h-full">
                <DiffEditor
                  before={report?.currentSupergraphSdl ?? ''}
                  lineNumbers
                  after={report?.nativeCompositionResult?.supergraphSdl ?? null}
                />
              </div>
            </>
          )}
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
