import { ReactElement, useState } from 'react';
import { Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/button/button';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CONTRACT_FORM_ID,
  ContractForm,
  ContractFormSchema,
  type ContractFormValues,
} from './contract-form';

const SchemaContractsQuery = graphql(`
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
            isDisabled
            viewerCanDisableContract
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

const DisableContractDialog_DisableContractMutation = graphql(`
  mutation DisableContractDialog_DisableContractMutation($input: DisableContractInput!) {
    disableContract(input: $input) {
      ok {
        disabledContract {
          id
          isDisabled
          viewerCanDisableContract
        }
      }
      error {
        message
      }
    }
  }
`);

function DisableContractDialog(props: {
  open: boolean;
  /** Null while closed. */
  contractId: string | null;
  onClose: () => void;
}) {
  const [state, mutate] = useMutation(DisableContractDialog_DisableContractMutation);
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
      if (result.data?.disableContract.ok) {
        toast({
          title: 'Contract disabled',
          description: 'The Contract was successfully disabled.',
        });
        props.onClose();
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Failed to disable contract',
        description: result.error?.message ?? result.data?.disableContract.error?.message,
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
      title="Disable Contract"
      description="A disabled contract is retired and can not be activated again. When disabling a contract the corresponding CDN artifacts (schema, supergraph) will be irreversibly deleted."
      confirm={{
        label: 'Disable Contract',
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

export function SchemaContracts(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [disabledContractId, setDisabledContractId] = useState<string | null>(null);
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
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
    },
  });

  const contracts = schemaContractsQuery.data?.target?.contracts.edges;

  function onDisable(nodeId: string) {
    setDisabledContractId(nodeId);
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.isDisabled ? (
          <DataTableCell
            kind="status"
            label="Inactive"
            icon={Info}
            iconTone="warning"
            tooltip="This Contract is no longer active and no more contract versions or contract checks will be published for it. It is not possible to enable a contract again. Please create a new contract instead."
          />
        ) : (
          <DataTableCell
            kind="status"
            label="Active"
            icon={Info}
            tooltip="This Contract is active. Schema publishes and checks will attempt to also build the contract schema."
          />
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
        row.original.viewerCanDisableContract ? (
          <DataTableCell
            kind="actions"
            label={`Actions for ${row.original.contractName}`}
            sections={[
              [
                {
                  label: 'Disable',
                  variant: 'destructiveAction',
                  onClick: () => onDisable(row.original.id),
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
        rowState={contract => (contract.isDisabled ? { disabled: true } : undefined)}
      />
      <DisableContractDialog
        open={disabledContractId !== null}
        contractId={disabledContractId}
        onClose={() => {
          setDisabledContractId(null);
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
