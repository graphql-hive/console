import { ReactElement, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { Check, MoreHorizontal, X } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { Badge } from '@/components/base/badge/badge';
import { Button as BaseButton } from '@/components/base/button/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Menu } from '@/components/base/floating/menu/menu';
import { Popover } from '@/components/base/floating/popover/popover';
import { itemVariants } from '@/components/base/floating/shared-styles';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Heading } from '@/components/ui/heading';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { InfoCircledIcon } from '@radix-ui/react-icons';

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

function DisableContractDialog(props: { contractId: string; onClose: () => void }) {
  const [state, mutate] = useMutation(DisableContractDialog_DisableContractMutation);

  function submit() {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    mutate({
      input: {
        contract: { byId: props.contractId },
      },
    });
  }

  return (
    <Dialog open onOpenChange={open => open === false && props.onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Disable Contract</DialogTitle>
          <DialogDescription>
            <p>A disabled contract is retired and can not be activated again.</p>
            <p>
              When disabling a contract the corresponding CDN artifacts (schema, supergraph) will be
              irreversibly deleted.
            </p>
          </DialogDescription>
        </DialogHeader>
        {state?.data?.disableContract?.ok && (
          <div className="py-2">The Contract was successfully disabled.</div>
        )}
        {state?.data?.disableContract?.error && (
          <div className="py-2">{state.data.disableContract.error.message}</div>
        )}
        <DialogFooter>
          <Button onClick={props.onClose}>
            {state?.data?.disableContract?.ok ? 'Ok' : 'Close'}
          </Button>
          {!state?.data?.disableContract?.ok && (
            <Button
              type="submit"
              variant="destructive"
              disabled={state.fetching || !!state.data?.disableContract?.ok}
              onClick={submit}
            >
              Disable Contract
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SchemaContracts(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [disabledContractId, setDisabledContractId] = useState<string | null>(null);

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

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Schema Contracts"
        description="Schema Contracts allow you to have separate public graphs that are a subset of the main graph."
        docsLink={{ href: '/management/contracts', text: 'Learn more about Schema Contracts' }}
      />
      <div className="my-3.5 flex justify-between">
        <Dialog>
          <DialogTrigger>
            <Button>Create new contract</Button>
          </DialogTrigger>
          <DialogContent>
            <CreateContractDialogContent
              target={schemaContractsQuery.data?.target ?? null}
              onCreateContract={refetchQuery}
            />
          </DialogContent>
        </Dialog>
      </div>
      {!!contracts?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Included Tags</TableHead>
              <TableHead>Excluded Tags</TableHead>
              <TableHead>Remove unreachable API Types</TableHead>
              <TableHead className="text-right">Created at</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map(({ node }) => (
              <TableRow key={node.id}>
                <TableCell className={cn(node.isDisabled && 'opacity-30')}>
                  {node.contractName}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {node.isDisabled ? (
                      <>
                        <span className="text-yellow-500">Inactive</span>
                        <Popover
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="ml-2 text-yellow-500"
                              aria-label="Why inactive"
                            >
                              <InfoCircledIcon className="size-4" />
                            </Button>
                          }
                          openOnHover
                          width="lg"
                          content={
                            <div className="text-neutral-11 text-sm font-normal">
                              <p>
                                This Contract is no longer active and no more contract versions or
                                contract checks will be published for it.
                              </p>
                              <p className="mt-1">
                                It is not possible to enable a contract again. Please create a new
                                contract instead.
                              </p>
                            </div>
                          }
                        />
                      </>
                    ) : (
                      <>
                        <span>Active</span>
                        <Popover
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="ml-2"
                              aria-label="About active contracts"
                            >
                              <InfoCircledIcon className="size-4" />
                            </Button>
                          }
                          openOnHover
                          width="lg"
                          content={
                            <p className="text-neutral-11 text-sm font-normal">
                              This Contract is active. Schema publishes and checks will attempt to
                              also build the contract schema.
                            </p>
                          }
                        />
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cn(node.isDisabled && 'opacity-30')}>
                  {node.includeTags ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {node.includeTags.map(tag => (
                        <Badge key={tag} content={tag} />
                      ))}
                    </span>
                  ) : (
                    'None'
                  )}
                </TableCell>
                <TableCell className={cn(node.isDisabled && 'opacity-30')}>
                  {node.excludeTags ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {node.excludeTags.map(tag => (
                        <Badge key={tag} content={tag} />
                      ))}
                    </span>
                  ) : (
                    'None'
                  )}
                </TableCell>
                <TableCell className={cn('text-center', node.isDisabled && 'opacity-30')}>
                  {node.removeUnreachableTypesFromPublicApiSchema ? (
                    <Check className="size-4" />
                  ) : (
                    <X className="size-4" />
                  )}
                </TableCell>
                <TableCell className={cn('text-right', node.isDisabled && 'opacity-30')}>
                  <TimeAgo date={node.createdAt} />
                </TableCell>
                <TableCell className="text-end">
                  {node.viewerCanDisableContract && (
                    <Menu
                      align="end"
                      trigger={
                        <Button variant="ghost" className="size-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                      sections={[
                        {
                          label: 'Actions',
                          items: [
                            {
                              label: 'Disable',
                              variant: 'destructiveAction',
                              onClick: () => onDisable(node.id),
                            },
                          ],
                        },
                      ]}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {disabledContractId && (
        <DisableContractDialog
          contractId={disabledContractId}
          onClose={() => {
            setDisabledContractId(null);
          }}
        />
      )}
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

function CreateContractDialogContent(props: {
  target: FragmentType<typeof CreateContractDialogContentTargetFragment> | null;
  onCreateContract: () => void;
}): ReactElement {
  const target = useFragment(CreateContractDialogContentTargetFragment, props.target);
  const [mutation, mutate] = useMutation(CreateContractMutation);
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
        }
      });
    },
  });

  return (
    <>
      {mutation.data?.createContract.ok ? (
        <div className="flex grow flex-col gap-5">
          <Heading className="text-center">Contract successfully created!</Heading>
          <div>
            The first contract version will be published upon the next schema version is published.
          </div>
          <div className="grow" />
          <DialogClose asChild>
            <Button className="ml-auto">Ok, got it!</Button>
          </DialogClose>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit} className="flex flex-1 flex-col items-stretch gap-12">
          <div className="flex flex-col gap-5">
            <Heading className="text-center">Create Schema Contract</Heading>
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

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit" disabled={mutation.fetching}>
                Create Contract
              </Button>
            </DialogFooter>
          </div>
        </form>
      )}
    </>
  );
}
