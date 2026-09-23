import {
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { buildASTSchema, buildSchema, GraphQLSchema, parse } from 'graphql';
import { TriangleAlert } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import z from 'zod';
import { Button } from '@/components/base/button/button';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Input } from '@/components/base/input/input';
import { Label } from '@/components/base/label/label';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { Tabs } from '@/components/base/tabs/tabs';
import { Textarea } from '@/components/base/textarea/textarea';
import { LayoutContent } from '@/components/layouts/layout-content';
import { ProposalChangeDetail } from '@/components/target/proposals/change-detail';
import { ProposalEditor, ServiceTab } from '@/components/target/proposals/editor';
import {
  SaveProposalContext,
  SaveProposalModal,
  SaveProposalProvider,
} from '@/components/target/proposals/save-proposal-modal';
import { schemaTitle } from '@/components/target/proposals/util';
import { Callout } from '@/components/ui/callout';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { addTypeForExtensions } from '@/lib/proposals/utils';
import { Change, CriticalityLevel, diff } from '@graphql-inspector/core';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

const ProposeChangesMutation = graphql(`
  mutation ProposalsNew_ProposeChanges($input: CreateSchemaProposalInput!) {
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

export function TargetProposalsNewPage() {
  return (
    <>
      <Meta title="Schema proposals" />
      <LayoutContent className="h-(--content-height) flex min-h-[300px] flex-col pb-0">
        <SaveProposalProvider>
          <ProposalsNewContent />
        </SaveProposalProvider>
      </LayoutContent>
    </>
  );
}

function ProposalsNewHeading(props: { sideContent?: ReactNode }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  return (
    <div className="flex py-6">
      <div className="flex-1">
        <SubPageLayoutHeader
          sideContent={props.sideContent}
          subPageTitle={
            <span className="flex items-center">
              <Link
                className="text-neutral-12"
                to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
                params={{
                  organizationSlug,
                  projectSlug,
                  targetSlug,
                }}
              >
                Schema Proposals
              </Link>{' '}
              <span className="text-neutral-10 inline-block px-2 italic">/</span> New
            </span>
          }
          description="Collaborate on schema changes to reduce friction during development."
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

  const rows = props.confirmations.map((confirmation, index) => ({
    id: String(index),
    ...confirmation,
  }));
  const columns: ColumnDef<(typeof rows)[number], unknown>[] = [
    {
      id: 'confirm',
      header: 'Confirm',
      meta: { align: 'center', width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="checkbox"
          checked={confirmed[row.index] ?? false}
          onCheckedChange={checked =>
            setConfirmed(prev =>
              prev.map((value, index) => (index === row.index ? checked : value)),
            )
          }
          label={`Confirm ${row.original.name}`}
        />
      ),
    },
    {
      id: 'schema',
      header: 'Schema',
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} mono />,
    },
    {
      id: 'reason',
      header: 'Change',
      meta: { width: 'fill' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.reason} truncate />,
    },
  ];

  return (
    <Dialog
      open={props.confirmations.length > 0}
      onOpenChange={isOpen => {
        if (!isOpen) {
          props.setConfirmations([]);
        }
      }}
      width="xl"
      title="Issues Found"
      description="The proposed changes are invalid but can be automatically corrected."
      footer={
        <Button
          onSurface="raised"
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
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={row => row.id}
        pagination={{ kind: 'none' }}
        variants={{ onSurface: 'raised' }}
      />
    </Dialog>
  );
}

function ProposalsNewContent(props: { page?: string }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: ProposalsNewProposalQuery,
    variables: {
      targetReference: {
        bySelector: {
          organizationSlug,
          projectSlug,
          targetSlug,
        },
      },
    },
  });
  const [_, proposeChanges] = useMutation(ProposeChangesMutation);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [serviceDiff, setServiceDiff] = useState<Array<{
    title: string;
    changes: Change[];
    error?: string;
    type: 'CompositeSchema' | 'SingleSchema';
  }> | null>(null);
  const { saveChanges } = useContext(SaveProposalContext);

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
                  organizationSlug,
                  projectSlug,
                  targetSlug,
                },
              },
              title: payload?.title ?? '',
              description: payload?.description,
              isDraft: true,
              author: query.data.me.displayName,
            },
          });

          const schemaProposalId = data?.createSchemaProposal.ok?.schemaProposal.id;
          if (schemaProposalId) {
            try {
              await saveChanges({
                author: query.data.me.displayName ?? null,
                changes: changedServices,
                organizationSlug,
                projectSlug,
                targetSlug,
                schemaProposalId,
              });
            } catch (e) {
              setEditorError(e instanceof Error ? e.message : 'Something went wrong.');
            }
          }
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
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          setEditorError(message);
          setIsSubmitting(false);
        }
      }
    });
  }, [changedServices, title, description, existingServices, serviceDiff]);

  // Live verify the title and description inputs
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

  // Live update the list of changes locally
  useEffect(() => {
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
              let existingSchema: GraphQLSchema | null = null;
              if (existingService.source.length) {
                const ast = addTypeForExtensions(parse(existingService.source));
                existingSchema = buildASTSchema(ast, { assumeValid: true, assumeValidSDL: true });
              }

              let proposedSchema: GraphQLSchema | null = null;
              if (changedService.source.length) {
                const ast = addTypeForExtensions(parse(changedService.source));
                proposedSchema = buildASTSchema(ast, { assumeValid: true, assumeValidSDL: true });
              }

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
      <>
        <ProposalsNewHeading />
        <Callout type="error" className="mx-auto w-2/3">
          <b>Oops, something went wrong.</b>
          <br />
          {query.error.message}
        </Callout>
      </>
    );
  }

  return (
    <>
      <ProposalsNewHeading
        {...props}
        sideContent={
          // @todo disable if proposal is invalid
          <Button
            variant="primary"
            disabled={query.fetching || isSubmitting}
            onClick={onSubmitProposal}
          >
            {isSubmitting ? <Spinner /> : 'Submit Proposal'}
          </Button>
        }
      />
      <SaveProposalModal />
      <ConfirmationModal confirmations={confirmations} setConfirmations={setConfirmations} />
      <Tabs
        orientation="vertical"
        value={page}
        onValueChange={setPage}
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
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
            ),
          },
          {
            value: 'editor',
            label: 'Editor',
            content: query.fetching ? (
              <Spinner />
            ) : (
              <ProposalEditor
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
            ),
          },
          {
            value: 'changes',
            label: 'Changes',
            content: query.fetching ? <Spinner /> : <ChangesTab diffs={serviceDiff} />,
          },
        ]}
      />
    </>
  );
}

function ChangesTab(props: {
  diffs: Array<{ title: string; changes: Change[]; error?: string }> | null;
}) {
  return (
    <>
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
    </>
  );
}

function DiffService(props: { title: string; changes: Change<any>[]; error?: string }) {
  return (
    <div>
      <Title>{props.title}</Title>
      <div className="mb-6">
        {props.error ? (
          <div className="flex items-center text-red-500">
            <TriangleAlert className="mr-2 size-4" />
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

function OverviewTab(props: {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  error?: false | ReactElement;
}) {
  return (
    <div className="max-w-[600px]">
      {props.error}
      <div className="pb-10">
        <Label htmlFor="proposal-title" label="Title (required)" />
        <div className="mt-2">
          <Input
            aria-label="title"
            id="proposal-title"
            name="proposal-title"
            value={props.title}
            onChange={e => props.setTitle(e.currentTarget.value)}
            maxLength={72}
          />
        </div>
      </div>
      <div className="pb-10">
        <Label htmlFor="proposal-description" label="Description" />
        <div className="mt-2">
          <Textarea
            aria-label="description"
            id="proposal-description"
            name="proposal-description"
            autoSize
            rows={6}
            value={props.description}
            onChange={e => props.setDescription(e.currentTarget.value)}
            maxLength={5000}
          />
        </div>
      </div>
    </div>
  );
}
