import { ReactElement, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import { Trash2 } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { z } from 'zod';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Input } from '@/components/base/input/input';
import { PageLead } from '@/components/base/page-lead';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Heading } from '@/components/ui/heading';
import { AlertTriangleIcon } from '@/components/ui/icon';
import { SubPageLayout } from '@/components/ui/page-content-layout';
import { Modal } from '@/components/v2';
import { InlineCode } from '@/components/v2/inline-code';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

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

function CreateCDNAccessTokenModal(props: {
  onCreateCDNAccessToken: () => void;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const [createCdnAccessToken, mutate] = useMutation(CDNAccessTokenCreateMutation);

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      alias: '',
    },
    validationSchema: Yup.object().shape({
      alias: Yup.string().required('Please enter an alias').min(3).max(100),
    }),
    onSubmit: async values => {
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
    },
  });

  useEffect(() => {
    if (createCdnAccessToken.data?.createCdnAccessToken.ok?.createdCdnAccessToken.id) {
      props.onCreateCDNAccessToken();
    }
  }, [createCdnAccessToken.data?.createCdnAccessToken.ok?.createdCdnAccessToken.id]);

  let body = (
    <form className="flex flex-1 flex-col items-stretch gap-12" onSubmit={form.handleSubmit}>
      <div className="flex flex-col gap-5">
        <Heading className="text-center">Create CDN Access Token</Heading>
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-sm font-semibold" htmlFor="alias">
          CDN Access Token Alias
        </label>
        <Input
          placeholder="Alias"
          name="alias"
          value={form.values.alias}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          disabled={form.isSubmitting}
          invalid={form.touched.alias && !!form.errors.alias}
          onKeyPress={ev => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              form.handleSubmit();
            }
          }}
        />
        {form.touched.alias && form.errors.alias ? (
          <span className="text-sm text-red-500">{form.errors.alias}</span>
        ) : null}
      </div>

      <div className="mt-auto flex w-full gap-2 self-end">
        <Button
          variant="secondary"
          className="ml-auto"
          onClick={ev => {
            ev.preventDefault();
            props.onClose();
          }}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={createCdnAccessToken.fetching}>
          Create
        </Button>
      </div>
    </form>
  );

  if (createCdnAccessToken.data?.createCdnAccessToken.ok) {
    body = (
      <div className="flex flex-1 flex-col items-stretch gap-12">
        <div className="flex flex-col gap-5">
          <Heading className="text-center">Create CDN Access Token</Heading>
        </div>

        <p>The CDN Access Token was successfully created.</p>

        <div className="flex items-center gap-2 rounded-sm bg-yellow-500/10 p-4 text-yellow-500">
          <AlertTriangleIcon className="size-5" />
          <span>
            Please store this access token securely. You will not be able to see it again.
          </span>
        </div>

        <InlineCode content={createCdnAccessToken.data.createCdnAccessToken.ok.secretAccessToken} />

        <div className="mt-auto flex w-full gap-2 self-end">
          <Button className="ml-auto" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  } else if (createCdnAccessToken.data?.createCdnAccessToken.error) {
    body = (
      <div className="flex flex-1 flex-col items-stretch gap-12">
        <div className="flex flex-col gap-5">
          <Heading className="text-center">Delete CDN Access Token</Heading>
        </div>

        <p>Something went wrong.</p>

        <Callout type="warning">
          {createCdnAccessToken.data?.createCdnAccessToken.error.message}
        </Callout>

        <Button className="ml-auto" onClick={props.onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <Modal open className="w-[650px]" onOpenChange={props.onClose}>
      {body}
    </Modal>
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
  cdnAccessTokenId: string;
  onDeletedAccessTokenId: (deletedAccessTokenId: string) => void;
  onClose: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const [deleteCdnAccessToken, mutate] = useMutation(CDNAccessTokenDeleteMutation);

  useEffect(() => {
    if (deleteCdnAccessToken.data?.deleteCdnAccessToken.ok?.deletedCdnAccessTokenId) {
      props.onDeletedAccessTokenId(
        deleteCdnAccessToken.data.deleteCdnAccessToken.ok.deletedCdnAccessTokenId,
      );
    }
  }, [deleteCdnAccessToken.data?.deleteCdnAccessToken.ok?.deletedCdnAccessTokenId ?? null]);

  const onClose = () => props.onClose();

  let body = (
    <div className="flex flex-1 flex-col items-stretch gap-12">
      <div className="flex flex-col gap-5">
        <Heading className="text-center">Delete CDN Access Tokens</Heading>
      </div>
      <Callout type="warning">
        Deleting an CDN access token can not be undone. After deleting the access token it might
        take up to 5 minutes before the changes are propagated across the CDN.
      </Callout>
      <p>Are you sure you want to delete the CDN Access Token?</p>

      <div className="mt-auto flex w-full gap-2 self-end">
        <Button className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={deleteCdnAccessToken.fetching}
          variant="destructive"
          onClick={() =>
            mutate({
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
            })
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );

  if (deleteCdnAccessToken.data?.deleteCdnAccessToken.ok) {
    body = (
      <div className="flex flex-1 flex-col items-stretch gap-12">
        <div className="flex flex-col gap-5">
          <Heading className="text-center">Delete CDN Access Token</Heading>
        </div>

        <p>The CDN Access Token was successfully deleted.</p>

        <Callout type="warning">
          It can take up to 5 minutes before the changes are propagated across the CDN.
        </Callout>
        <div className="mt-auto flex w-full gap-2 self-end">
          <Button className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  } else if (deleteCdnAccessToken.data?.deleteCdnAccessToken.error) {
    body = (
      <div className="flex flex-1 flex-col items-stretch gap-12">
        <div className="flex flex-col gap-5">
          <Heading className="text-center">Delete CDN Access Token</Heading>
        </div>

        <p>Something went wrong.</p>

        <Callout type="warning">
          {deleteCdnAccessToken.data?.deleteCdnAccessToken.error.message}
        </Callout>
        <div className="mt-auto flex w-full gap-2 self-end">
          <Button className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Modal open className="w-[650px]" onOpenChange={onClose}>
      {body}
    </Modal>
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
        <Button asChild>
          <Link
            search={{
              page: 'cdn',
              cdn: 'create',
            }}
          >
            Create new CDN token
          </Link>
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

      {searchParams.cdn === 'create' ? (
        <CreateCDNAccessTokenModal
          onCreateCDNAccessToken={() => {
            reexecuteQuery({ requestPolicy: 'network-only' });
          }}
          onClose={closeModal}
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
        />
      ) : null}
      {searchParams.cdn === 'delete' ? (
        <DeleteCDNAccessTokenModal
          cdnAccessTokenId={searchParams.id}
          onDeletedAccessTokenId={() => {
            reexecuteQuery({ requestPolicy: 'network-only' });
          }}
          onClose={closeModal}
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
        />
      ) : null}
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
