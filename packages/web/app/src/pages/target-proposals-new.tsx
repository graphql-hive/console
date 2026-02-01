import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { buildSchema } from 'graphql';
import { useMutation, useQuery } from 'urql';
import z from 'zod';
import { Page, TargetLayout } from '@/components/layouts/target';
import { ProposalChangeDetail } from '@/components/target/proposals/change-detail';
import {
  ProposalEditor,
  Proposals_SelectFragmentType,
  Proposals_TargetProjectTypeFragmentType,
  Service,
  ServiceTab,
} from '@/components/target/proposals/editor';
import { schemaTitle } from '@/components/target/proposals/util';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox, Modal, Table, TBody, Td, Th, THead, Tr } from '@/components/v2';
import { graphql } from '@/gql';
import { cn } from '@/lib/utils';
import { Change, CriticalityLevel, diff } from '@graphql-inspector/core';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Link, useNavigate } from '@tanstack/react-router';

const ProposeChangesMutation = graphql(`
  mutation Proposals_ProposeChanges($input: CreateSchemaProposalInput!) {
    createSchemaProposal(input: $input) {
      ok {
        schemaProposal {
          id
        }
      }
      error {
        message
        details {
          title
          description
        }
      }
    }
  }
`);

const ProposalsNewProposalQuery = graphql(`
  query ProposalsNewProposalQuery($targetReference: TargetReferenceInput!) {
    me {
      id
      displayName
    }
    target(reference: $targetReference) {
      ...Proposals_SelectFragment
      ...Proposals_TargetProjectTypeFragment
      id
      slug
      project {
        id
        type
      }
      latestValidSchemaVersion {
        id
        schemas {
          edges {
            cursor
            node {
              __typename
              ... on CompositeSchema {
                id
                source
                service
                url
              }
              ... on SingleSchema {
                id
                source
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`);

export function TargetProposalsNewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Schema proposals" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Proposals}
        className="h-(--content-height) flex min-h-[300px] flex-col pb-0"
      >
        <ProposalsNewHeading {...props} />
        <ProposalsNewContent {...props} />
      </TargetLayout>
    </>
  );
}

function ProposalsNewHeading(props: Parameters<typeof TargetProposalsNewPage>[0]) {
  return (
    <div className="flex py-6">
      <div className="flex-1">
        <SubPageLayoutHeader
          subPageTitle={
            <span className="flex items-center">
              <Link
                className="text-neutral-12"
                to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
              >
                Schema Proposals
              </Link>{' '}
              <span className="text-neutral-10 inline-block px-2 italic">/</span> New
            </span>
          }
          description={
            <CardDescription>
              Collaborate on schema changes to reduce friction during development.
            </CardDescription>
          }
        />
      </div>
    </div>
  );
}

type Confirmation = { name: string; type: 'removal'; reason: string };

const ProposalForm = z.strictObject({
  title: z.string().min(1, 'Proposals must have a title'),
  description: z.optional(z.string()).default(() => ''),
});

const ServiceDiff = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('SingleSchema'),
    title: z.string().max(0).optional(),
    changes: z.array(z.any()),
    error: z.optional(z.string()),
  }),
  z.strictObject({
    type: z.literal('CompositeSchema'),
    title: z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-zA-Z][\w_-]*$/g,
        'Invalid service name. Service name must be 64 characters or less, must start with a letter, and can only contain alphanumeric characters, dash (-), or underscore (_).',
      ),
    changes: z.array(z.any()),
    error: z.optional(z.string()),
  }),
]);

function ConfirmationModal(props: {
  confirmations: Confirmation[];
  setConfirmations: (c: Confirmation[]) => void;
}) {
  const [confirmed, setConfirmed] = useState(props.confirmations.map(_ => false));
  useEffect(() => {
    setConfirmed(props.confirmations.map(_ => false));
  }, [props.confirmations]);
  return (
    <Modal
      open={props.confirmations.length > 0}
      onOpenChange={isOpen => {
        if (isOpen === false) {
          props.setConfirmations([]);
        }
      }}
      className="w-[90vw]"
    >
      <SubPageLayoutHeader
        subPageTitle="Issues Found"
        description={
          <CardDescription className="pb-4">
            The proposed changes are invalid but can be automatically corrected.
          </CardDescription>
        }
      />
      <Table>
        <THead>
          <Th className="px-0 text-center">confirm</Th>
          <Th>schema</Th>
          <Th>explanation</Th>
        </THead>
        <TBody>
          {props.confirmations.map((c, idx) => {
            return (
              <Tr key={idx}>
                <Td>
                  <Checkbox
                    className="mx-auto"
                    checked={confirmed[idx]}
                    onClick={_ => {
                      confirmed[idx] = !confirmed[idx];
                      setConfirmed([...confirmed]);
                    }}
                  />
                </Td>
                <Td className="truncate">{c.name}</Td>
                <Td className="break-normal">{c.reason}</Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      <div className="mt-4 text-right">
        <Button
          disabled={!confirmed.every(c => c)}
          onClick={() => {
            const allConfirmed = confirmed.every(c => c);
            if (allConfirmed) {
              props.setConfirmations([]);
              // submit api call
            }
          }}
        >
          Confirm Changes
        </Button>
      </div>
    </Modal>
  );
}

function ProposalsNewContent(
  props: Parameters<typeof TargetProposalsNewPage>[0] & { page?: string },
) {
  const navigate = useNavigate();
  const [query] = useQuery({
    query: ProposalsNewProposalQuery,
    variables: {
      targetReference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
    },
  });
  const [_, proposeChanges] = useMutation(ProposeChangesMutation);
  // const [_, updateProposedChanges] = useMutation(UpdateProposedChangesMutation);
  // updateProposedChanges({
  //   input: {
  //     schemaProposalId: '', // @todo
  //   }
  // })
  const [isSubmitting, setIsSubmitting] = useState(false);
  // overview error
  const [overviewError, setOverviewError] = useState('');
  const [editorError, setEditorError] = useState('');
  const existingServices = useMemo(() => {
    return query.data?.target?.latestValidSchemaVersion?.schemas.edges.map(e => e.node);
  }, [query.data]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState('overview');
  const [confirmations, setConfirmations] = useState<Array<Confirmation>>([]);
  const [changedServices, setChangedServices] = useState<Array<ServiceTab>>([]);
  // @todo consider calculating from the supergraph?
  const [serviceDiff, setServiceDiff] = useState<Array<{
    title: string;
    changes: Change[];
    error?: string;
    type: 'CompositeSchema' | 'SingleSchema';
  }> | null>(null);
  const onSubmitProposal = useCallback(() => {
    setIsSubmitting(true);
    setTimeout(async () => {
      let payload: { title: string; description: string } | undefined;
      try {
        payload = ProposalForm.parse({ title, description });
      } catch (error) {
        if (error instanceof z.ZodError) {
          setOverviewError(error.issues[0]?.message);
          // go to overview page because that's where the issue is
          setPage('overview');
          return setIsSubmitting(false);
        }
      }

      if (!serviceDiff) {
        // this shouldn't happen
        return setIsSubmitting(false);
      }

      try {
        for (const service of serviceDiff) {
          ServiceDiff.parse(service);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          setEditorError(error.issues[0]?.message ?? error.message);
          // go to overview page because that's where the issue is
          setPage('editor');
          return setIsSubmitting(false);
        }
      }

      // if the proposal has real, tangible changes
      let hasChanges = false;

      // @todo how to make sure "serviceDiff" is done calculating before we use it?
      const confs: typeof confirmations = [];
      for (const diff of serviceDiff) {
        if (diff.error) {
          if (diff.title?.length) {
            setEditorError(`"${diff.title}" has an error: ${diff.error}`);
          } else {
            setEditorError(`The SDL contains an error: ${diff.error}`);
          }
          setPage('editor');
          setIsSubmitting(false);
          return;
        }

        if (diff.changes.length === 0) {
          // no changes
          confs.push({
            type: 'removal',
            name: diff.title,
            reason: 'No changes found.',
          });
        } else {
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        setEditorError('No changes found. Select a service to change or create a new one.');
        setPage('editor');
        setIsSubmitting(false);
        return;
      }

      setEditorError('');
      setConfirmations(confs);

      // if nothing to confirm, then publish
      if (confs.length === 0) {
        try {
          if (!query.data) {
            throw new Error('Cannot determine author because data is missing.');
          }
          const { data, error } = await proposeChanges({
            input: {
              target: {
                bySelector: {
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                },
              },
              title: payload?.title ?? '',
              description: payload?.description,
              isDraft: true,
              author: query.data.me.displayName,
              initialChecks: changedServices.map(s => ({
                sdl: s.source,
                service: s.__typename === 'CompositeSchema' ? s.service : '',
                meta: {
                  author: query.data!.me.displayName,
                  commit: '',
                },
                url: s.__typename === 'CompositeSchema' ? s.url : undefined,
                // @todo url, meta, etc...
                // and set author in backend?...
              })),
            },
          });
          setIsSubmitting(false);
          if (error) {
            setEditorError(error?.message ?? 'An error occurred when submitting the proposal.');
            setPage('editor');
            return;
          }
          if (data?.createSchemaProposal.error || !data?.createSchemaProposal.ok) {
            const err = data?.createSchemaProposal.error;
            setOverviewError(
              err?.details.title ??
                err?.details.description ??
                err?.message ??
                'Could not submit proposal.',
            );
            setPage('overview');
            return;
          }
          await navigate({
            to: '/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId',
            params: {
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: data.createSchemaProposal.ok.schemaProposal.id,
            },
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setEditorError(message);
          setIsSubmitting(false);
        }
      }
    });
  }, [changedServices, title, description, existingServices, serviceDiff]);
  useEffect(() => {
    if (overviewError) {
      try {
        ProposalForm.parse({ title, description });
        setOverviewError('');
      } catch (error) {
        if (error instanceof z.ZodError) {
          setOverviewError(error.issues[0]?.message);
        }
      }
    }
  }, [title, description]);

  useEffect(() => {
    // @todo only run when we have to show changes
    // but also run on submit???? for the approval??
    // if (page !== 'changes') {
    //   return;
    // }
    const resultPromises = changedServices.map(
      (
        changedService,
      ):
        | NonNullable<typeof serviceDiff>[number]
        | Promise<NonNullable<typeof serviceDiff>[number]> => {
        // if not a new service with blank ID
        if (changedService.id.length !== 0) {
          const existingService = existingServices?.find(
            existing => existing.id === changedService.id,
          );
          if (existingService) {
            try {
              const existingSchema = buildSchema(existingService.source, {
                assumeValid: true,
                assumeValidSDL: true,
              });
              const proposedSchema = buildSchema(changedService.source, {
                // @todo consider not assuming valid...
                // this is a workaround for missing federation directive definitions
                assumeValid: true,
                assumeValidSDL: true,
              });

              return diff(existingSchema, proposedSchema)
                .then(result => ({
                  title: schemaTitle(changedService),
                  changes: result,
                  type: changedService.__typename,
                }))
                .catch((e: unknown) => {
                  return {
                    title: schemaTitle(changedService),
                    changes: [],
                    error: e instanceof Error ? e.message : String(e),
                    type: changedService.__typename,
                  };
                });
            } catch (e) {
              return {
                title: schemaTitle(changedService),
                changes: [],
                error: e instanceof Error ? e.message : String(e),
                type: changedService.__typename,
              };
            }
          }
        }

        const title = schemaTitle(changedService);
        try {
          if (changedService.source.length) {
            // check that schema is valid
            buildSchema(changedService.source);
            return {
              title,
              changes: [
                {
                  criticality: {
                    level: CriticalityLevel.NonBreaking,
                    reason: 'Adding a new service is safe.',
                  },
                  type: '',
                  meta: null,
                  message: title.length > 0 ? `Schema "${title}" added` : 'New schema added',
                },
              ],
              type: changedService.__typename,
            };
          }
          return { title, changes: [], type: changedService.__typename };
        } catch (e: unknown) {
          return {
            title,
            changes: [],
            error: e instanceof Error ? e.message : String(e),
            type: changedService.__typename,
          };
        }
      },
    );
    Promise.all(resultPromises)
      .then(result => {
        setServiceDiff(result);
      })
      .catch(_ => setServiceDiff(null));
  }, [changedServices, existingServices, page]);

  if (query.error) {
    return (
      <Callout type="error" className="mx-auto w-2/3">
        <b>Oops, something went wrong.</b>
        <br />
        {query.error.message}
      </Callout>
    );
  }

  return (
    <>
      <ConfirmationModal confirmations={confirmations} setConfirmations={setConfirmations} />
      <Tabs orientation="vertical" className="flex" value={page} onValueChange={setPage}>
        <TabsList
          variant="content"
          className={cn(
            'flex h-full w-[20vw] min-w-[160px] flex-col items-start border-0',
            '*:flex *:w-full *:justify-start *:p-3',
          )}
        >
          <TabsTrigger variant="menu" value="overview" asChild>
            <Link>Overview</Link>
          </TabsTrigger>
          <TabsTrigger variant="menu" value="editor" asChild>
            <Link>Editor</Link>
          </TabsTrigger>
          <TabsTrigger variant="menu" value="changes" asChild className="mb-2">
            <Link>Changes</Link>
          </TabsTrigger>
          {/* @todo disable if proposal is invalid */}
          <div className="mt-6">
            <Button
              variant="ghost"
              className="mt-2 w-full justify-center px-3 font-bold"
              disabled={query.fetching || isSubmitting}
              onClick={onSubmitProposal}
            >
              {isSubmitting ? <Spinner /> : 'Submit Proposal'}
            </Button>
          </div>
        </TabsList>
        <div className="w-full flex-col items-start overflow-x-hidden pl-8 *:pt-0">
          <OverviewTab
            title={title}
            description={description}
            setTitle={setTitle}
            setDescription={setDescription}
            error={
              overviewError.length > 0 && (
                <Callout type="error" className="mb-6 w-full text-sm">
                  {overviewError}
                </Callout>
              )
            }
          />
          {query.fetching ? (
            <Spinner />
          ) : (
            <>
              <EditorTab
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                changedServices={changedServices}
                setChangedServices={setChangedServices}
                existingServices={existingServices ?? []}
                projectTypeFragment={query.data?.target ?? undefined}
                selectFragment={query.data?.target ?? undefined}
                error={
                  editorError.length > 0 && (
                    <Callout type="error" className="mb-6 w-full text-sm">
                      {editorError}
                    </Callout>
                  )
                }
              />
              <ChangesTab diffs={serviceDiff} />
            </>
          )}
        </div>
      </Tabs>
    </>
  );
}

function ChangesTab(props: {
  diffs: Array<{ title: string; changes: Change[]; error?: string }> | null;
}) {
  return (
    <TabsContent value="changes">
      {props.diffs === null && <Spinner />}
      {props.diffs?.length === 0 && (
        <div className="mt-8 text-center">
          <Title className="text-center">No changes</Title>
          <Subtitle className="text-center">
            Use the "Editor" to make modifications to your schema(s)
          </Subtitle>
        </div>
      )}
      {props.diffs?.map((changeProps, idx) => <DiffService key={idx} {...changeProps} />)}
    </TabsContent>
  );
}

function DiffService(props: { title: string; changes: Change<any>[]; error?: string }) {
  return (
    <div>
      <Title>{props.title}</Title>
      <div className="mb-6">
        {props.error ? (
          <div className="flex items-center text-red-500">
            <ExclamationTriangleIcon className="mr-2" />
            {props.error}
          </div>
        ) : (
          props.changes.length === 0 && <div className="italic">No changes to schema yet.</div>
        )}
        {props.changes.map((c, changeIndex) => {
          return <ProposalChangeDetail change={c} key={`${c.type}-${c.path ?? changeIndex}`} />;
        })}
      </div>
    </div>
  );
}

function EditorTab(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  projectTypeFragment: Proposals_TargetProjectTypeFragmentType | undefined;
  selectFragment: Proposals_SelectFragmentType | undefined;
  changedServices: Array<ServiceTab>;
  setChangedServices: (s: Array<ServiceTab>) => void;
  existingServices: Array<Service>;
  error?: false | ReactElement;
}) {
  return (
    <TabsContent value="editor">
      <ProposalEditor {...props} />
    </TabsContent>
  );
}

function OverviewTab(props: {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  error?: false | ReactElement;
}) {
  return (
    <TabsContent className="max-w-[600px]" value="overview">
      {props.error}
      <div className="pb-10">
        <Label htmlFor="proposal-title" className="p-1">
          Title <span className="text-neutral-10">(required)</span>
        </Label>
        <Input
          aria-label="title"
          id="proposal-title"
          name="proposal-title"
          className="mt-2"
          value={props.title}
          onChange={e => props.setTitle(e.currentTarget.value)}
          maxLength={72}
        />
      </div>
      <div className="pb-10">
        <Label className="p-1" htmlFor="proposal-description">
          Description
        </Label>
        <Textarea
          aria-label="description"
          id="proposal-description"
          name="proposal-description"
          // @ts-expect-error: because fieldSizing doesnt exist on the current version
          style={{ fieldSizing: 'content' }}
          className="mt-2 h-auto min-h-40 resize-none"
          value={props.description}
          onChange={e => props.setDescription(e.currentTarget.value)}
          maxLength={5000}
        />
      </div>
    </TabsContent>
  );
}
