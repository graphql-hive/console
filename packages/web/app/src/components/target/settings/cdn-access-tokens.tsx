import { ReactElement, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import {
  Button,
  Card,
  Heading,
  Input,
  Modal,
  Table,
  Tag,
  TBody,
  Td,
  TimeAgo,
  Tr,
} from '@/components/v2';
import { AlertTriangleIcon, TrashIcon } from '@/components/v2/icon';
import { InlineCode } from '@/components/v2/inline-code';
import { FragmentType, graphql, useFragment } from '@/gql';
import { TargetAccessScope } from '@/gql/graphql';
import { canAccessTarget } from '@/lib/access/target';
import { useRouteSelector } from '@/lib/hooks';

const CDNAccessTokeRowFragment = graphql(`
  fragment CDNAccessTokens_CdnAccessTokenRowFragment on CdnAccessToken {
    id
    firstCharacters
    lastCharacters
    alias
    createdAt
  }
`);

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
}): ReactElement {
  const router = useRouteSelector();
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
          selector: {
            organization: router.organizationId,
            project: router.projectId,
            target: router.targetId,
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
        <label className="text-sm font-semibold" htmlFor="buildUrl">
          CDN Access Token Alias
        </label>
        <Input
          placeholder="Alias"
          name="alias"
          value={form.values.alias}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          disabled={form.isSubmitting}
          isInvalid={form.touched.alias && !!form.errors.alias}
        />
        {form.touched.alias && form.errors.alias ? (
          <span className="text-sm text-red-500">{form.errors.alias}</span>
        ) : null}
      </div>

      <div className="mt-auto flex w-full gap-2 self-end">
        <Button size="large" className="ml-auto" onClick={props.onClose}>
          Abort
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="large"
          disabled={createCdnAccessToken.fetching}
        >
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

        <div className="flex items-center gap-2 rounded-sm p-4 bg-yellow-500/10 text-yellow-500">
          <AlertTriangleIcon className="h-5 w-5" />
          <span>
            Please store this access token securely. You will not be able to see it again.
          </span>
        </div>

        <InlineCode content={createCdnAccessToken.data.createCdnAccessToken.ok.secretAccessToken} />

        <div className="mt-auto flex w-full gap-2 self-end">
          <Button variant="primary" size="large" className="ml-auto" onClick={props.onClose}>
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

        <Tag color="yellow" className="py-2.5 px-4">
          <AlertTriangleIcon className="h-5 w-5" />
          {createCdnAccessToken.data?.createCdnAccessToken.error.message}
        </Tag>

        <Button variant="primary" size="large" className="ml-auto" onClick={props.onClose}>
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
}): ReactElement {
  const router = useRouteSelector();
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
      <Tag color="yellow" className="py-2.5 px-4">
        <AlertTriangleIcon className="h-5 w-5" />
        Deleting an CDN access token can not be undone. After deleting the access token it might
        take up to 5 minutes before the changes are propagated across the CDN.
      </Tag>
      <p>Are you sure you want to delete the CDN Access Token?</p>

      <div className="mt-auto flex w-full gap-2 self-end">
        <Button variant="primary" size="large" className="ml-auto" onClick={onClose}>
          Abort
        </Button>
        <Button
          disabled={deleteCdnAccessToken.fetching}
          danger
          variant="primary"
          size="large"
          onClick={() =>
            mutate({
              input: {
                selector: {
                  organization: router.organizationId,
                  project: router.projectId,
                  target: router.targetId,
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

        <Tag color="yellow" className="py-2.5 px-4">
          <AlertTriangleIcon className="h-5 w-5" />
          It can take up to 5 minutes before the changes are propagated across the CDN.
        </Tag>
        <div className="mt-auto flex w-full gap-2 self-end">
          <Button variant="primary" size="large" className="ml-auto" onClick={onClose}>
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

        <Tag color="yellow" className="py-2.5 px-4">
          <AlertTriangleIcon className="h-5 w-5" />
          {deleteCdnAccessToken.data?.deleteCdnAccessToken.error.message}
        </Tag>
        <div className="mt-auto flex w-full gap-2 self-end">
          <Button variant="primary" size="large" className="ml-auto" onClick={onClose}>
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
    target(selector: $selector) {
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

const isDeleteCDNAccessTokenModalPath = (path: string): null | string => {
  const pattern = /#delete-cdn-access-token\?id=(([a-zA-Z-\d]*))$/;

  const result = path.match(pattern);
  if (result === null) {
    return null;
  }

  return result[1];
};

const CDNAccessTokens_MeFragment = graphql(`
  fragment CDNAccessTokens_MeFragment on Member {
    ...CanAccessTarget_MemberFragment
  }
`);

export function CDNAccessTokens(props: {
  me: FragmentType<typeof CDNAccessTokens_MeFragment>;
}): React.ReactElement {
  const me = useFragment(CDNAccessTokens_MeFragment, props.me);
  const routerSelector = useRouteSelector();
  const router = useRouter();

  const [endCursors, setEndCursors] = useState<Array<string>>([]);

  const openCreateCDNAccessTokensModalLink = `${router.asPath}#create-cdn-access-token`;
  const isCreateCDNAccessTokensModalOpen = router.asPath.endsWith('#create-cdn-access-token');

  const deleteCDNAccessTokenId = useMemo(() => {
    return isDeleteCDNAccessTokenModalPath(router.asPath);
  }, [router.asPath]);

  const closeModal = () => {
    void router.push(router.asPath.split('#')[0], undefined, {
      scroll: false,
    });
  };

  const [target, reexecuteQuery] = useQuery({
    query: CDNAccessTokensQuery,
    variables: {
      selector: {
        organization: routerSelector.organizationId,
        project: routerSelector.projectId,
        target: routerSelector.targetId,
      },
      first: 10,
      after: endCursors[endCursors.length - 1] ?? null,
    },
    requestPolicy: 'cache-and-network',
  });

  const canManage = canAccessTarget(TargetAccessScope.Settings, me);

  return (
    <Card>
      <Heading id="cdn-access-tokens" className="mb-2">
        CDN Access Token
      </Heading>
      <p className="mb-3 font-light text-gray-300">
        Be careful! These tokens allow accessing the schema artifacts of your target.
      </p>
      {canManage && (
        <div className="my-3.5 flex justify-between">
          <Button
            as="a"
            href={openCreateCDNAccessTokensModalLink}
            variant="secondary"
            onClick={ev => {
              ev.preventDefault();
              void router.push(openCreateCDNAccessTokensModalLink);
            }}
            size="large"
            className="px-5"
          >
            Create new CDN Token
          </Button>
        </div>
      )}
      <Table>
        <TBody>
          {target?.data?.target?.cdnAccessTokens.edges?.map(edge => {
            const node = useFragment(CDNAccessTokeRowFragment, edge.node);

            return (
              <Tr key={node.id}>
                <Td>
                  {node.firstCharacters + new Array(10).fill('•').join('') + node.lastCharacters}
                </Td>
                <Td>{node.alias}</Td>
                <Td align="right">
                  created <TimeAgo date={node.createdAt} />
                </Td>
                <Td align="right">
                  <Button
                    className="hover:text-red-500"
                    onClick={() => {
                      void router.push(
                        `${router.asPath}#delete-cdn-access-token?id=${edge.node.id}`,
                      );
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>

      <div className="my-3.5 flex justify-end">
        {target.data?.target?.cdnAccessTokens.pageInfo.hasPreviousPage ? (
          <Button
            variant="secondary"
            size="large"
            className="mr-2 px-5"
            onClick={() => {
              setEndCursors(cursors => {
                if (cursors.length === 0) {
                  return cursors;
                }
                return cursors.slice(0, cursors.length - 1);
              });
            }}
          >
            Previous Page
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="large"
          className="px-5"
          disabled={!target.data?.target?.cdnAccessTokens.pageInfo.hasNextPage}
          onClick={() => {
            setEndCursors(cursors => {
              if (!target.data?.target?.cdnAccessTokens.pageInfo.endCursor) {
                return cursors;
              }
              return [...cursors, target.data?.target?.cdnAccessTokens.pageInfo.endCursor];
            });
          }}
        >
          Next Page
        </Button>
      </div>
      {isCreateCDNAccessTokensModalOpen ? (
        <CreateCDNAccessTokenModal
          onCreateCDNAccessToken={() => {
            reexecuteQuery({ requestPolicy: 'network-only' });
          }}
          onClose={closeModal}
        />
      ) : null}
      {deleteCDNAccessTokenId ? (
        <DeleteCDNAccessTokenModal
          cdnAccessTokenId={deleteCDNAccessTokenId}
          onDeletedAccessTokenId={() => {
            reexecuteQuery({ requestPolicy: 'network-only' });
          }}
          onClose={closeModal}
        />
      ) : null}
    </Card>
  );
}
