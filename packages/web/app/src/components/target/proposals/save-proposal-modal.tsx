import { createContext, ReactNode, useContext, useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { CheckIcon } from '@/components/ui/icon';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Spinner } from '@/components/ui/spinner';
import { Modal, Table, TBody, Td, Th, THead, Tr } from '@/components/v2';
import { graphql } from '@/gql';
import { useNavigate } from '@tanstack/react-router';
import { ServiceTab } from './editor';

export type Progress = Array<
  { title: string; loading: boolean } | { title: string; error: string }
>;

const UpdateProposedChangesMutation = graphql(`
  mutation ProposalsNew_UpdateProposedChanges($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      ... on SchemaCheckSuccess {
        schemaCheck {
          id
        }
      }
      ... on SchemaCheckError {
        errors {
          edges {
            node {
              path
              message
            }
          }
        }
      }
    }
  }
`);

export const SaveProposalContext = createContext({
  saveChanges: (_: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaProposalId: string;
    author: string | null;
    changes: ServiceTab[];
  }) => Promise.resolve(void 0),
  state: [] as Progress,
  isSaving: false,
  selector: null as {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaProposalId: string;
  } | null,
});

export function SaveProposalProvider(props: { children: ReactNode }) {
  const [checksInProgress, setChecksInProgress] = useState<Progress>([]);
  const [__, proposeSchema] = useMutation(UpdateProposedChangesMutation);
  const [isSaving, setIsSaving] = useState(false);
  const [selector, setSelector] = useState<{
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaProposalId: string;
  } | null>(null);

  return (
    <SaveProposalContext.Provider
      value={{
        saveChanges: async args => {
          setIsSaving(true);
          setSelector({
            organizationSlug: args.organizationSlug,
            projectSlug: args.projectSlug,
            targetSlug: args.targetSlug,
            schemaProposalId: args.schemaProposalId,
          });
          setChecksInProgress(
            args.changes.map(s => ({
              loading: true,
              title: s.__typename === 'CompositeSchema' ? (s.service ?? '') : 'Single Schema',
            })),
          );

          for (let i = 0; i < args.changes.length; i++) {
            const s = args.changes[i];
            const title = s.__typename === 'CompositeSchema' ? (s.service ?? '') : 'Single Schema';
            try {
              const check = await proposeSchema({
                input: {
                  schemaProposalId: args.schemaProposalId,
                  sdl: s.source,
                  service: s.__typename === 'CompositeSchema' ? s.service : '',
                  meta: args.author
                    ? {
                        author: args.author,
                        commit: '',
                      }
                    : null,
                  url: s.__typename === 'CompositeSchema' ? s.url : undefined,
                  target: {
                    bySelector: {
                      organizationSlug: args.organizationSlug,
                      projectSlug: args.projectSlug,
                      targetSlug: args.targetSlug,
                    },
                  },
                },
              });
              if (check.error) {
                checksInProgress[i] = {
                  error: check.error.message ?? 'Something went wrong.',
                  title,
                };
              } else {
                checksInProgress[i] = {
                  loading: false,
                  title,
                };
              }
            } catch (e: unknown) {
              checksInProgress[i] = {
                error: e instanceof Error ? e.message : 'Something went wrong.',
                title,
              };
            } finally {
              // force component refresh by copying the array... This isnt the most efficient thing
              // but there shouldn't ever be a ton of checks to where it matters
              const checksCopy = [...checksInProgress];
              setChecksInProgress(checksCopy);
            }
          }
        },
        state: checksInProgress,
        isSaving,
        selector,
      }}
    >
      {props.children}
    </SaveProposalContext.Provider>
  );
}

export function SaveProposalModal() {
  const navigate = useNavigate();
  const { state, isSaving, selector } = useContext(SaveProposalContext);

  return (
    <Modal
      open={isSaving && !!selector}
      onOpenChange={async isOpen => {
        if (isOpen === false && selector) {
          // on close, navigate to the proposal's show page
          await navigate({
            to: '/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId',
            params: {
              organizationSlug: selector.organizationSlug,
              projectSlug: selector.projectSlug,
              targetSlug: selector.targetSlug,
              proposalId: selector.schemaProposalId!,
            },
            search: {
              ts: Date.now(), // force refresh by updating a timestamp
            },
          });
        }
      }}
      className="w-[90vw]"
    >
      <SubPageLayoutHeader
        subPageTitle="Proposal Submission"
        description={
          <CardDescription className="pb-4">The proposed changes being published.</CardDescription>
        }
      />
      <Table>
        <THead>
          <Th className="max-w-[120px] pl-4 pr-0">schema</Th>
          <Th>status</Th>
        </THead>
        <TBody>
          {state.map((c, idx) => {
            if ('error' in c) {
              return (
                <Tr key={idx}>
                  <Td className="max-w-[120px] truncate pr-0">{c.title}</Td>
                  <Td className="flex items-center break-normal">
                    <TriangleAlertIcon className="text-red-500" />
                    {c.error}
                  </Td>
                </Tr>
              );
            }
            return (
              <Tr key={idx}>
                <Td className="max-w-[120px] truncate pr-0">{c.title}</Td>
                <Td className="flex items-center break-normal">
                  {c.loading ? <Spinner /> : <CheckIcon className="text-green-500" />}
                  {c.loading ? 'loading' : 'complete'}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      <div className="mt-4 text-right">
        <Button
          disabled={!state.every(c => 'error' in c || c.loading === false)}
          onClick={async () => {
            if (!selector) {
              // should never happen
              return;
            }
            await navigate({
              to: '/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId',
              params: {
                organizationSlug: selector.organizationSlug,
                projectSlug: selector.projectSlug,
                targetSlug: selector.targetSlug,
                proposalId: selector.schemaProposalId!,
              },
              search: {
                ts: Date.now(), // force refresh by updating a timestamp
              },
            });
          }}
        >
          View Proposal
        </Button>
      </div>
    </Modal>
  );
}
