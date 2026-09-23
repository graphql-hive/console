import { ReactElement, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { PageLead } from '@/components/base/page-lead';
import { useToast } from '@/components/base/toast/toast';
import { Callout } from '@/components/ui/callout';
import { SubPageLayout } from '@/components/ui/page-content-layout';
import { InlineCode } from '@/components/v2/inline-code';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CDN_TOKEN_FORM_ID,
  CdnTokenForm,
  CdnTokenFormSchema,
  type CdnTokenFormValues,
} from './cdn-token-form';

const cdnRoute = getRouteApi(
  '/authenticated/$organizationSlug/$projectSlug/$targetSlug/settings/cdn',
);

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
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
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
            organizationSlug,
            projectSlug,
            targetSlug,
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
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
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
                  organizationSlug,
                  projectSlug,
                  targetSlug,
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

export function CDNAccessTokens(): React.ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [endCursors, setEndCursors] = useState<Array<string>>([]);
  const navigate = cdnRoute.useNavigate();
  const { cdn, id } = cdnRoute.useSearch();

  const closeModal = () => {
    void navigate({ search: {} });
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
        organizationSlug,
        projectSlug,
        targetSlug,
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
        <Button
          render={
            <Link
              from="/$organizationSlug/$projectSlug/$targetSlug/settings/cdn"
              search={{ cdn: 'create' }}
            />
          }
        >
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
        open={cdn === 'create'}
        onOpenChangeComplete={resetOnClose}
        onCreateCDNAccessToken={() => {
          reexecuteQuery({ requestPolicy: 'network-only' });
        }}
        onClose={closeModal}
      />
      <DeleteCDNAccessTokenModal
        open={cdn === 'delete'}
        cdnAccessTokenId={cdn === 'delete' ? (id ?? null) : null}
        onDeletedAccessTokenId={() => {
          reexecuteQuery({ requestPolicy: 'network-only' });
        }}
        onClose={closeModal}
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
  const navigate = cdnRoute.useNavigate();
  return (
    <DataTableCell
      kind="icon-button"
      icon={Trash2}
      label={`Delete ${node.alias}`}
      destructive
      onClick={() => {
        void navigate({ search: { cdn: 'delete', id: node.id } });
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
