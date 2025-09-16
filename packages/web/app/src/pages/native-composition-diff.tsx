import { ReactNode } from 'react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffEditor } from '@/components/v2';
import { graphql } from '@/gql';
import { useClipboard } from '@/lib/hooks';

type NativeCompositionDiffProps = {
  projectId: string;
};

const NativeCompositionDiff_NativeCompositionDiffQuery = graphql(/* GraphQL */ `
  query NativeCompositionDiff_NativeCompositionDiffQuery($projectId: ID!) {
    project(reference: { byId: $projectId }) {
      id
      nativeFederationCompatibility {
        status
        results {
          currentSupergraphSdl
          nativeCompositionResult {
            supergraphSdl
            errors {
              nodes {
                message
              }
            }
          }
          schemaVersion {
            schemas {
              edges {
                node {
                  ... on CompositeSchema {
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

  const clipboard = useClipboard();

  if (!result.data?.project?.nativeFederationCompatibility) {
    return null;
  }

  const { nativeFederationCompatibility } = result.data.project;

  return (
    <>
      <h1>Native Composition Report Project {result.data.project.id}</h1>
      <h2>Status: {nativeFederationCompatibility.status}</h2>
      <Tabs>
        <TabsList>
          {nativeFederationCompatibility.results.map((result, index) =>
            result ? <TabsTrigger value={String(index)}>Target {index}</TabsTrigger> : null,
          )}
        </TabsList>
        {nativeFederationCompatibility.results.map((result, index) =>
          result ? (
            <TabsContent value={String(index)}>
              <div>
                <div>Supergraph Diff</div>
                <div>
                  <DiffEditor
                    before={result.currentSupergraphSdl}
                    after={result.nativeCompositionResult.supergraphSdl ?? null}
                  />
                </div>
              </div>
              <div>
                <div>Composition Errors:</div>
                <div>
                  {result.nativeCompositionResult.errors?.nodes?.length ? (
                    <ul>
                      {result.nativeCompositionResult.errors.nodes.map(error => (
                        <li>{error.message}</li>
                      ))}
                    </ul>
                  ) : (
                    'None'
                  )}
                </div>
              </div>
              <div className="mb-10">
                <Button
                  onClick={() => {
                    const services = result.schemaVersion?.schemas.edges.map(edge => ({
                      sdl: (edge.node as any).source,
                      name: (edge.node as any).service,
                    }));

                    clipboard(JSON.stringify(services, null, 2));
                  }}
                >
                  Copy services to clipboard
                </Button>
              </div>
            </TabsContent>
          ) : null,
        )}
      </Tabs>
    </>
  );
}
