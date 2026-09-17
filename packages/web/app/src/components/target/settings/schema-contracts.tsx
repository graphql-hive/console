import { ReactElement, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { Check, Info, X } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { Button as BaseButton } from '@/components/base/button/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { itemVariants } from '@/components/base/floating/shared-styles';
import { Input } from '@/components/base/input/input';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/ui/button';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

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

const CreateContractDialogContentTargetFragment = graphql(`
  fragment CreateContractDialogContentTargetFragment on Target {
    id
    latestSchemaVersion {
      id
      tags
    }
  }
`);

/**
 * The tag list under an include/exclude field: every tag on the latest schema version, with a
 * check on the ones already picked. Rows toggle without closing, and the popover keeps focus in
 * the field, so the list is a picker beside typing rather than a replacement for it.
 */
function TagSuggestions(props: {
  tags: readonly string[];
  selected: readonly string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="w-[200px] p-1">
      <div className="text-neutral-10 px-2 py-1.5 text-xs font-medium">
        Tags from latest schema version
      </div>
      {props.tags.map(value => (
        <button
          key={value}
          type="button"
          onClick={() => props.onToggle(value)}
          className={itemVariants({
            selected: props.selected.includes(value),
            className: 'hover:bg-neutral-5 hover:text-neutral-12 w-full',
          })}
        >
          <Check
            className={cn(
              'mr-2 size-4',
              props.selected.includes(value) ? 'opacity-100' : 'opacity-0',
            )}
          />
          {value}
        </button>
      ))}
    </div>
  );
}

function CreateContractDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
  target: FragmentType<typeof CreateContractDialogContentTargetFragment> | null;
  onCreateContract: () => void;
}): ReactElement {
  const target = useFragment(CreateContractDialogContentTargetFragment, props.target);
  const [mutation, mutate] = useMutation(CreateContractMutation);
  const { toast } = useToast();
  // The tag lists open from focus in their field and close on outside press or Escape; the field
  // is the anchor rather than a trigger so the Add button beside it does not toggle them.
  const includeTagsInputRef = useRef<HTMLInputElement>(null);
  const [includeTagsOpen, setIncludeTagsOpen] = useState(false);
  const excludeTagsInputRef = useRef<HTMLInputElement>(null);
  const [excludeTagsOpen, setExcludeTagsOpen] = useState(false);

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      contractName: '',
      includeTags: [] as Array<string>,
      includeTagsInput: '',
      excludeTags: [] as Array<string>,
      excludeTagsInput: '',
      removeUnreachableTypesFromPublicApiSchema: true,
    },
    validationSchema: Yup.object().shape({
      contractName: Yup.string().required('Required'),
      includeTagsInput: Yup.string(),
      excludeTagsInput: Yup.string(),
    }),
    onSubmit: values => {
      if (!target) {
        return;
      }

      return mutate({
        input: {
          target: {
            byId: target.id,
          },
          contractName: values.contractName,
          includeTags: values.includeTags,
          excludeTags: values.excludeTags,
          removeUnreachableTypesFromPublicApiSchema:
            values.removeUnreachableTypesFromPublicApiSchema,
        },
      }).then(result => {
        if (result.data?.createContract.ok) {
          props.onCreateContract();
          toast({
            title: 'Contract created',
            description:
              'The first contract version will be published upon the next schema version is published.',
          });
          props.onOpenChange(false);
        }
      });
    },
  });

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
          <Button type="submit" form="create-contract-form" disabled={mutation.fetching}>
            Create Contract
          </Button>
        </>
      }
    >
      <form id="create-contract-form" onSubmit={form.handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="contractName">
            Contract Name
          </label>
          <Input
            placeholder="Contract Name"
            name="contractName"
            value={form.values.contractName}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
            disabled={form.isSubmitting}
            autoComplete="off"
            onSurface="raised"
            invalid={
              !!(
                mutation.data?.createContract.error?.details?.contractName ??
                (form.touched.contractName ? form.errors.contractName : null)
              )
            }
          />
          <span className="text-sm text-red-500 after:invisible after:content-['.']">
            {mutation.data?.createContract.error?.details?.contractName ??
              (form.touched.contractName ? form.errors.contractName : null)}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="includeTagsInput">
            Included Tags
          </label>
          <div className="flex">
            <div className="flex-1">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  ref={includeTagsInputRef}
                  id="includeTagsInput"
                  name="includeTagsInput"
                  autoComplete="off"
                  onSurface="raised"
                  value={form.values.includeTagsInput}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  onFocus={() => setIncludeTagsOpen(true)}
                  onClick={() => setIncludeTagsOpen(true)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void form.setValues(values => ({
                        ...values,
                        includeTagsInput: '',
                        includeTags: values.includeTags.includes(values.includeTagsInput)
                          ? values.includeTags
                          : [...values.includeTags, values.includeTagsInput],
                      }));
                    }
                  }}
                  placeholder="Add included tag"
                  disabled={form.isSubmitting}
                />
                <Button
                  type="button"
                  onClick={() => {
                    void form.setValues(values => ({
                      ...values,
                      includeTagsInput: '',
                      includeTags: values.includeTags.includes(values.includeTagsInput)
                        ? values.includeTags
                        : [...values.includeTags, values.includeTagsInput],
                    }));
                  }}
                  disabled={form.isSubmitting || form.values.includeTagsInput === ''}
                >
                  Add
                </Button>
              </div>
              <Popover
                open={includeTagsOpen}
                onOpenChange={setIncludeTagsOpen}
                anchor={includeTagsInputRef}
                align="start"
                initialFocus={false}
                padding="none"
                width="auto"
                content={
                  <TagSuggestions
                    tags={target?.latestSchemaVersion?.tags ?? []}
                    selected={form.values.includeTags}
                    onToggle={currentValue => {
                      void form.setValues(values => ({
                        ...values,
                        includeTags: values.includeTags.includes(currentValue)
                          ? values.includeTags.filter(value => currentValue !== value)
                          : [...values.includeTags, currentValue],
                      }));
                    }}
                  />
                }
              />
              <div className="mt-2 text-sm text-red-500 after:invisible after:content-['.']">
                {mutation.data?.createContract.error?.details?.includeTags ??
                  form.errors.includeTags}
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-1 pl-3">
              {form.values.includeTags.map(value => (
                <BaseButton
                  key={value}
                  type="button"
                  size="compact"
                  onSurface="raised"
                  aria-label={`Remove ${value}`}
                  onClick={ev => {
                    void form.setValues(values => ({
                      ...values,
                      includeTags: values.includeTags.filter(tagValue => tagValue !== value),
                    }));
                    ev.stopPropagation();
                  }}
                >
                  {value}
                  <X className="size-3" />
                </BaseButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="excludeTagsInput">
            Excluded Tags
          </label>
          <div className="flex">
            <div className="flex-1">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  ref={excludeTagsInputRef}
                  id="excludeTagsInput"
                  name="excludeTagsInput"
                  autoComplete="off"
                  onSurface="raised"
                  value={form.values.excludeTagsInput}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  onFocus={() => setExcludeTagsOpen(true)}
                  onClick={() => setExcludeTagsOpen(true)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void form.setValues(values => ({
                        ...values,
                        excludeTagsInput: '',
                        excludeTags: values.excludeTags.includes(values.excludeTagsInput)
                          ? values.excludeTags
                          : [...values.excludeTags, values.excludeTagsInput],
                      }));
                    }
                  }}
                  placeholder="Add excluded tag"
                  disabled={form.isSubmitting}
                />
                <Button
                  type="button"
                  onClick={() => {
                    void form.setValues(values => ({
                      ...values,
                      excludeTagsInput: '',
                      excludeTags: values.excludeTags.includes(values.excludeTagsInput)
                        ? values.excludeTags
                        : [...values.excludeTags, values.excludeTagsInput],
                    }));
                  }}
                  disabled={form.isSubmitting || form.values.excludeTagsInput === ''}
                >
                  Add
                </Button>
              </div>
              <Popover
                open={excludeTagsOpen}
                onOpenChange={setExcludeTagsOpen}
                anchor={excludeTagsInputRef}
                align="start"
                initialFocus={false}
                padding="none"
                width="auto"
                content={
                  <TagSuggestions
                    tags={target?.latestSchemaVersion?.tags ?? []}
                    selected={form.values.excludeTags}
                    onToggle={currentValue => {
                      void form.setValues(values => ({
                        ...values,
                        excludeTags: values.excludeTags.includes(currentValue)
                          ? values.excludeTags.filter(value => currentValue !== value)
                          : [...values.excludeTags, currentValue],
                      }));
                    }}
                  />
                }
              />
              <div className="mt-2 text-sm text-red-500 after:invisible after:content-['.']">
                {mutation.data?.createContract.error?.details?.excludeTags ??
                  form.errors.excludeTags}
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-1 pl-3">
              {form.values.excludeTags.map(value => (
                <BaseButton
                  key={value}
                  type="button"
                  size="compact"
                  onSurface="raised"
                  aria-label={`Remove ${value}`}
                  onClick={ev => {
                    void form.setValues(values => ({
                      ...values,
                      excludeTags: values.excludeTags.filter(tagValue => tagValue !== value),
                    }));
                    ev.stopPropagation();
                  }}
                >
                  {value}
                  <X className="size-3" />
                </BaseButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label
            className="text-sm font-semibold"
            htmlFor="removeUnreachableTypesFromPublicApiSchema"
          >
            Remove unreachable Types
          </label>
          <div className="flex items-center pl-1 pt-2">
            <Checkbox
              id="removeUnreachableTypesFromPublicApiSchema"
              checked={form.values.removeUnreachableTypesFromPublicApiSchema}
              value="removeUnreachableTypesFromPublicApiSchema"
              onCheckedChange={newValue =>
                form.setFieldValue('removeUnreachableTypesFromPublicApiSchema', newValue)
              }
              disabled={form.isSubmitting}
            />
            <label
              htmlFor="removeUnreachableTypesFromPublicApiSchema"
              className="text-neutral-11 ml-2 inline-block cursor-pointer text-sm"
            >
              Remove unreachable types from public API schema
            </label>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
