import { ReactElement, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { PageLead } from '@/components/base/page-lead';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/button/button';
import { Callout } from '@/components/ui/callout';
import { SubPageLayout } from '@/components/ui/page-content-layout';
import { InlineCode } from '@/components/v2/inline-code';
import { FragmentType, graphql, useFragment } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CDN_TOKEN_FORM_ID,
  CdnTokenForm,
  CdnTokenFormSchema,
  type CdnTokenFormValues,
} from './cdn-token-form';

const CDNAccessTokenCreateMutation = graphql(`
  mutation CDNAccessTokens_CDNAccessTokenCreateMutation($input: CreateCdnAccessTokenInput!) {
    createCdnAccessToken(input: $input) {
      error {
        message
      }
      ok {
        createdCdnAccessToken {
          id
          ...CDNAccessTokens_CdnAccessTokenRowFragment
        }
        secretAccessToken
      }
    }
  }
`);

export function CreateCDNAccessTokenModal(props: {
  open: boolean;
  onOpenChangeComplete: (open: boolean) => void;
  onCreateCDNAccessToken: () => void;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const [createCdnAccessToken, mutate] = useMutation(CDNAccessTokenCreateMutation);

  const form = useForm<CdnTokenFormValues>({
    resolver: zodResolver(CdnTokenFormSchema),
    defaultValues: {
      alias: '',
    },
    disabled: createCdnAccessToken.fetching,
  });

  async function onSubmit(values: CdnTokenFormValues) {
    await mutate({
      input: {
        target: {
          bySelector: {
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
          },
        },
        alias: values.alias,
      },
    });
  }

  useEffect(() => {
    if (createCdnAccessToken.data?.createCdnAccessToken.ok?.createdCdnAccessToken.id) {
      props.onCreateCDNAccessToken();
    }
  }, [createCdnAccessToken.data?.createCdnAccessToken.ok?.createdCdnAccessToken.id]);

  const result = createCdnAccessToken.data?.createCdnAccessToken;

  if (result?.ok) {
    return (
      <Dialog
        open={props.open}
        onOpenChange={props.onClose}
        onOpenChangeComplete={props.onOpenChangeComplete}
        width="lg"
        title="Create CDN Access Token"
        description="The CDN Access Token was successfully created."
        footer={
          <Button onSurface="raised" onClick={props.onClose}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Callout type="warning">
            Please store this access token securely. You will not be able to see it again.
          </Callout>
          <InlineCode content={result.ok.secretAccessToken} />
        </div>
      </Dialog>
    );
  }

  if (result?.error) {
    return (
      <Dialog
        open={props.open}
        onOpenChange={props.onClose}
        onOpenChangeComplete={props.onOpenChangeComplete}
        width="lg"
        title="Create CDN Access Token"
        description="Something went wrong."
        footer={
          <Button onSurface="raised" onClick={props.onClose}>
            Close
          </Button>
        }
      >
        <Callout type="warning">{result.error.message}</Callout>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onClose}
      onOpenChangeComplete={props.onOpenChangeComplete}
      width="lg"
      title="Create CDN Access Token"
      footer={
        <>
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CDN_TOKEN_FORM_ID}
            onSurface="raised"
            disabled={createCdnAccessToken.fetching}
          >
            Create
          </Button>
        </>
      }
    >
      <CdnTokenForm form={form} onSubmit={onSubmit} />
    </Dialog>
  );
}

const CDNAccessTokenDeleteMutation = graphql(`
  mutation CDNAccessTokens_DeleteCDNAccessToken($input: DeleteCdnAccessTokenInput!) {
    deleteCdnAccessToken(input: $input) {
      error {
        message
      }
      ok {
        deletedCdnAccessTokenId
      }
    }
  }
`);

function DeleteCDNAccessTokenModal(props: {
  open: boolean;
  /** Null while closed. */
  cdnAccessTokenId: string | null;
  onDeletedAccessTokenId: (deletedAccessTokenId: string) => void;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const [deleteCdnAccessToken, mutate] = useMutation(CDNAccessTokenDeleteMutation);
  const { toast } = useToast();

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next && !deleteCdnAccessToken.fetching) {
          props.onClose();
        }
      }}
      title="Delete CDN Access Token"
      description="Are you sure you want to delete the CDN Access Token?"
      confirm={{
        label: 'Delete',
        variant: 'destructive',
        disabled: deleteCdnAccessToken.fetching || !props.cdnAccessTokenId,
        onClick: () => {
          if (!props.cdnAccessTokenId) {
            return;
          }
          void mutate({
            input: {
              target: {
                bySelector: {
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                },
              },
              cdnAccessTokenId: props.cdnAccessTokenId,
            },
          }).then(result => {
            const ok = result.data?.deleteCdnAccessToken.ok;
            if (ok) {
              props.onDeletedAccessTokenId(ok.deletedCdnAccessTokenId);
              toast({
                title: 'CDN access token deleted',
                description:
                  'It can take up to 5 minutes before the changes are propagated across the CDN.',
              });
              props.onClose();
              return;
            }
            toast({
              variant: 'destructive',
              title: 'Failed to delete CDN access token',
              description:
                result.error?.message ?? result.data?.deleteCdnAccessToken.error?.message,
            });
          });
        },
      }}
      cancel={{ disabled: deleteCdnAccessToken.fetching }}
    >
      <Callout type="warning">
        Deleting an CDN access token can not be undone. After deleting the access token it might
        take up to 5 minutes before the changes are propagated across the CDN.
      </Callout>
    </AlertDialog>
  );
}

const CDNAccessTokensQuery = graphql(`
  query CDNAccessTokensQuery($selector: TargetSelectorInput!, $first: Int!, $after: String) {
    target(reference: { bySelector: $selector }) {
      id
      cdnAccessTokens(first: $first, after: $after) {
        edges {
          node {
            id
            ...CDNAccessTokens_CdnAccessTokenRowFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }
  }
`);

const CDNSearchParams = z.discriminatedUnion('cdn', [
  z.object({
    cdn: z.literal('create').optional(),
  }),
  z.object({
    cdn: z.literal('delete'),
    id: z.string(),
  }),
]);

export function CDNAccessTokens(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): React.ReactElement {
  const [endCursors, setEndCursors] = useState<Array<string>>([]);
  const router = useRouter();
  const searchParamsResult = CDNSearchParams.safeParse(router.latestLocation.search);

  if (!searchParamsResult.success) {
    console.error('Invalid search params', searchParamsResult.error);
  }

  const searchParams = searchParamsResult.data ?? { cdn: undefined };

  const closeModal = () => {
    void router.navigate({
      search: {
        page: 'cdn',
      },
    });
  };

  const [overlaySession, setOverlaySession] = useState(0);
  const resetOnClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOverlaySession(s => s + 1);
    }
  };

  const [target, reexecuteQuery] = useQuery({
    query: CDNAccessTokensQuery,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      first: 10,
      after: endCursors[endCursors.length - 1] ?? null,
    },
    requestPolicy: 'cache-and-network',
  });

  return (
    <SubPageLayout>
      <PageLead
        title="CDN Access Token"
        description="CDN Access Tokens are used to access to Hive High-Availability CDN and read your schema artifacts."
        docsLink={{
          href: '/schema-registry/management/targets#cdn-access-tokens',
          text: 'Learn more about CDN Access Tokens',
        }}
      />

      <div className="my-3.5 flex justify-between">
        <Button render={<Link search={{ page: 'cdn', cdn: 'create' }} />}>
          Create new CDN token
        </Button>
      </div>
      <DataTable
        data={target.data?.target?.cdnAccessTokens.edges.map(edge => edge.node) ?? []}
        columns={CDN_TOKEN_COLUMNS}
        getRowId={token => token.id}
        loading={target.fetching && !target.data}
        emptyMessage="No CDN tokens yet."
        pagination={{
          kind: 'cursor',
          hasPreviousPage: target.data?.target?.cdnAccessTokens.pageInfo.hasPreviousPage ?? false,
          hasNextPage: target.data?.target?.cdnAccessTokens.pageInfo.hasNextPage ?? false,
          onPrevious: () => setEndCursors(cursors => cursors.slice(0, -1)),
          onNext: () => {
            const endCursor = target.data?.target?.cdnAccessTokens.pageInfo.endCursor;
            if (endCursor) {
              setEndCursors(cursors => [...cursors, endCursor]);
            }
          },
          summary: `Page ${endCursors.length + 1}`,
          loading: target.fetching && !!target.data,
        }}
      />

      <CreateCDNAccessTokenModal
        key={overlaySession}
        open={searchParams.cdn === 'create'}
        onOpenChangeComplete={resetOnClose}
        onCreateCDNAccessToken={() => {
          reexecuteQuery({ requestPolicy: 'network-only' });
        }}
        onClose={closeModal}
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
      />
      <DeleteCDNAccessTokenModal
        open={searchParams.cdn === 'delete'}
        cdnAccessTokenId={searchParams.cdn === 'delete' ? searchParams.id : null}
        onDeletedAccessTokenId={() => {
          reexecuteQuery({ requestPolicy: 'network-only' });
        }}
        onClose={closeModal}
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
      />
    </SubPageLayout>
  );
}

const CDNAccessTokenRowFragment = graphql(`
  fragment CDNAccessTokens_CdnAccessTokenRowFragment on CdnAccessToken {
    id
    firstCharacters
    lastCharacters
    alias
    createdAt
  }
`);

type CdnTokenNode = FragmentType<typeof CDNAccessTokenRowFragment> & { id: string };

function CdnTokenKeyCell(props: { token: CdnTokenNode }) {
  const node = useFragment(CDNAccessTokenRowFragment, props.token);
  return (
    <DataTableCell
      kind="text"
      value={node.firstCharacters + new Array(10).fill('•').join('') + node.lastCharacters}
      mono
    />
  );
}

function CdnTokenAliasCell(props: { token: CdnTokenNode }) {
  const node = useFragment(CDNAccessTokenRowFragment, props.token);
  return <DataTableCell kind="text" value={node.alias} weight="medium" />;
}

function CdnTokenCreatedCell(props: { token: CdnTokenNode }) {
  const node = useFragment(CDNAccessTokenRowFragment, props.token);
  return <DataTableCell kind="time" date={node.createdAt} />;
}

function CdnTokenDeleteCell(props: { token: CdnTokenNode }) {
  const node = useFragment(CDNAccessTokenRowFragment, props.token);
  const router = useRouter();
  return (
    <DataTableCell
      kind="icon-button"
      icon={Trash2}
      label={`Delete ${node.alias}`}
      destructive
      onClick={() => {
        void router.navigate({
          search: {
            page: 'cdn',
            cdn: 'delete',
            id: node.id,
          },
        });
      }}
    />
  );
}

const CDN_TOKEN_COLUMNS: ColumnDef<CdnTokenNode, unknown>[] = [
  { id: 'key', header: 'Key', cell: ({ row }) => <CdnTokenKeyCell token={row.original} /> },
  {
    id: 'alias',
    header: 'Alias',
    meta: { width: 'fill' },
    cell: ({ row }) => <CdnTokenAliasCell token={row.original} />,
  },
  {
    id: 'createdAt',
    header: 'Created At',
    meta: { align: 'right' },
    cell: ({ row }) => <CdnTokenCreatedCell token={row.original} />,
  },
  {
    id: 'delete',
    meta: { width: 'xs' },
    cell: ({ row }) => <CdnTokenDeleteCell token={row.original} />,
  },
];
