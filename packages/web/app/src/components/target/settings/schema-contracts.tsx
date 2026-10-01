import { ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CONTRACT_FORM_ID,
  ContractForm,
  ContractFormSchema,
  type ContractFormValues,
} from './contract-form';

export const SchemaContractsQuery = graphql(`
  query SchemaContractsQuery($selector: TargetSelectorInput!, $after: String) {
    target(reference: { bySelector: $selector }) {
      id
      ...CreateContractDialogContentTargetFragment
      contracts(after: $after) {
        edges {
          node {
            id
            contractName
            includeTags
            excludeTags
            removeUnreachableTypesFromPublicApiSchema
            createdAt
            viewerCanDeleteContract
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

const DeleteContractDialog_DeleteContractMutation = graphql(`
  mutation DeleteContractDialog_DeleteContractMutation($input: DeleteContractInput!) {
    deleteContract(input: $input) {
      ok {
        deletedContractId
      }
      error {
        message
      }
    }
  }
`);

function DeleteContractDialog(props: {
  open: boolean;
  /** Null while closed. */
  contractId: string | null;
  onClose: () => void;
  onDeleteContract: () => void;
}) {
  const [state, mutate] = useMutation(DeleteContractDialog_DeleteContractMutation);
  const { toast } = useToast();

  function submit() {
    if (!props.contractId) {
      return;
    }
    void mutate({
      input: {
        contract: { byId: props.contractId },
      },
    }).then(result => {
      if (result.data?.deleteContract.ok) {
        toast({
          title: 'Contract deleted',
          description: 'The contract was successfully deleted.',
        });
        props.onDeleteContract();
        props.onClose();
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Failed to delete contract',
        description: result.error?.message ?? result.data?.deleteContract.error?.message,
      });
    });
  }

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={next => {
        if (!next && !state.fetching) {
          props.onClose();
        }
      }}
      title="Delete Contract"
      description="This permanently deletes the contract, its history, checks, approvals, and corresponding CDN artifacts (schema and supergraph). This action cannot be undone."
      confirm={{
        label: 'Delete Contract',
        variant: 'destructive',
        disabled: state.fetching || !props.contractId,
        onClick: submit,
      }}
      cancel={{ disabled: state.fetching }}
    />
  );
}

type Contract = NonNullable<
  DocumentType<typeof SchemaContractsQuery>['target']
>['contracts']['edges'][number]['node'];

const tagsCell = (tags: readonly string[] | null | undefined) =>
  tags?.length ? (
    <DataTableCell kind="badge" items={tags.map(tag => ({ content: tag }))} />
  ) : (
    <DataTableCell kind="text" value="None" tone="muted" />
  );

export function SchemaContracts() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [contractIdToDelete, setContractIdToDelete] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [overlaySession, setOverlaySession] = useState(0);
  const resetOnClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOverlaySession(s => s + 1);
    }
  };

  const [schemaContractsQuery, reexecuteQuery] = useQuery({
    query: SchemaContractsQuery,
    variables: {
      selector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
    },
  });

  const contracts = schemaContractsQuery.data?.target?.contracts.edges;

  function onDelete(nodeId: string) {
    setContractIdToDelete(nodeId);
  }

  function refetchQuery() {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }

  const columns: ColumnDef<Contract, unknown>[] = [
    {
      id: 'name',
      header: 'Contract Name',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={row.original.contractName} weight="medium" />
      ),
    },
    {
      id: 'includeTags',
      header: 'Included Tags',
      cell: ({ row }) => tagsCell(row.original.includeTags),
    },
    {
      id: 'excludeTags',
      header: 'Excluded Tags',
      cell: ({ row }) => tagsCell(row.original.excludeTags),
    },
    {
      id: 'removeUnreachable',
      header: 'Remove unreachable API Types',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <DataTableCell
          kind="boolean"
          value={row.original.removeUnreachableTypesFromPublicApiSchema}
        />
      ),
    },
    {
      id: 'createdAt',
      header: 'Created at',
      meta: { align: 'right' },
      cell: ({ row }) => <DataTableCell kind="time" date={row.original.createdAt} />,
    },
    {
      id: 'actions',
      meta: { width: 'xs' },
      cell: ({ row }) =>
        row.original.viewerCanDeleteContract ? (
          <DataTableCell
            kind="actions"
            label={`Actions for ${row.original.contractName}`}
            sections={[
              [
                {
                  label: 'Delete',
                  variant: 'destructiveAction',
                  onClick: () => onDelete(row.original.id),
                },
              ],
            ]}
          />
        ) : null,
    },
  ];

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Schema Contracts"
        description="Schema Contracts allow you to have separate public graphs that are a subset of the main graph."
        docsLink={{ href: '/management/contracts', text: 'Learn more about Schema Contracts' }}
      />
      <div className="my-3.5 flex justify-between">
        <Button onClick={() => setCreateOpen(true)}>Create new contract</Button>
        <CreateContractDialog
          key={overlaySession}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onOpenChangeComplete={resetOnClose}
          target={schemaContractsQuery.data?.target ?? null}
          onCreateContract={refetchQuery}
        />
      </div>
      <DataTable
        data={contracts?.map(edge => edge.node) ?? []}
        columns={columns}
        getRowId={contract => contract.id}
        pagination={{ kind: 'none' }}
        loading={schemaContractsQuery.fetching && !schemaContractsQuery.data}
        emptyMessage="No contracts yet."
      />
      <DeleteContractDialog
        open={contractIdToDelete !== null}
        contractId={contractIdToDelete}
        onClose={() => {
          setContractIdToDelete(null);
          refetchQuery();
        }}
      />
    </SubPageLayout>
  );
}

const CreateContractMutation = graphql(`
  mutation CreateSchemaContractMutation($input: CreateContractInput!) {
    createContract(input: $input) {
      ok {
        createdContract {
          id
          target {
            id
          }
          contractName
          includeTags
          excludeTags
          removeUnreachableTypesFromPublicApiSchema
          createdAt
        }
      }
      error {
        message
        details {
          target
          contractName
          includeTags
          excludeTags
        }
      }
    }
  }
`);

export const CreateContractDialogContentTargetFragment = graphql(`
  fragment CreateContractDialogContentTargetFragment on Target {
    id
    latestSchemaVersion {
      id
      tags
    }
  }
`);

export function CreateContractDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
  target: FragmentType<typeof CreateContractDialogContentTargetFragment> | null;
  onCreateContract: () => void;
}): ReactElement {
  const target = useFragment(CreateContractDialogContentTargetFragment, props.target);
  const [mutation, mutate] = useMutation(CreateContractMutation);
  const { toast } = useToast();

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(ContractFormSchema),
    defaultValues: {
      contractName: '',
      includeTags: [],
      excludeTags: [],
      removeUnreachableTypesFromPublicApiSchema: true,
    },
    disabled: mutation.fetching,
  });

  async function onSubmit(values: ContractFormValues) {
    if (!target) {
      return;
    }

    const result = await mutate({
      input: {
        target: {
          byId: target.id,
        },
        contractName: values.contractName,
        includeTags: values.includeTags,
        excludeTags: values.excludeTags,
        removeUnreachableTypesFromPublicApiSchema: values.removeUnreachableTypesFromPublicApiSchema,
      },
    });
    if (result.data?.createContract.ok) {
      props.onCreateContract();
      toast({
        title: 'Contract created',
        description:
          'The first contract version will be published upon the next schema version is published.',
      });
      props.onOpenChange(false);
      return;
    }
    const details = result.data?.createContract.error?.details;
    if (details?.contractName) {
      form.setError('contractName', { message: details.contractName });
    }
    if (details?.includeTags) {
      form.setError('includeTags', { message: details.includeTags });
    }
    if (details?.excludeTags) {
      form.setError('excludeTags', { message: details.excludeTags });
    }
  }

  const close = () => props.onOpenChange(false);

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      onOpenChangeComplete={props.onOpenChangeComplete}
      title="Create Schema Contract"
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CONTRACT_FORM_ID}
            onSurface="raised"
            disabled={mutation.fetching}
          >
            Create Contract
          </Button>
        </>
      }
    >
      <ContractForm
        form={form}
        onSubmit={onSubmit}
        suggestedTags={target?.latestSchemaVersion?.tags ?? []}
      />
    </Dialog>
  );
}
