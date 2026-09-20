import { ReactElement, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { useCollections } from '@/lib/hooks/laboratory/use-collections';
import { useEditorContext } from '@graphiql/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { OperationForm, OperationFormSchema, type OperationFormValues } from './operation-form';

const EDIT_OPERATION_FORM_ID = 'edit-operation-form';

const UpdateOperationNameMutation = graphql(`
  mutation UpdateOperation(
    $selector: TargetSelectorInput!
    $input: UpdateDocumentCollectionOperationInput!
  ) {
    updateOperationInDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        operation {
          id
          name
          query
          variables
          headers
        }
      }
    }
  }
`);

export const EditOperationModal = (props: {
  operationId: string;
  close: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement => {
  const { toast } = useToast();
  const [updateOperationNameState, mutate] = useMutation(UpdateOperationNameMutation);
  const { collections } = useCollections({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });
  const { setTabState } = useEditorContext({ nonNull: true });

  const [collection, operation] = useMemo(() => {
    for (const collection of collections) {
      for (const operation of collection.operations.edges) {
        if (operation.node.id === props.operationId) {
          return [collection, operation.node] as const;
        }
      }
    }
    return [null, null] as const;
  }, [collections]);

  const form = useForm<OperationFormValues>({
    mode: 'all',
    resolver: zodResolver(OperationFormSchema),
    defaultValues: {
      name: operation?.name || '',
      collectionId: collection?.id || '',
    },
  });

  async function onSubmit(values: OperationFormValues) {
    const response = await mutate({
      selector: {
        targetSlug: props.targetSlug,
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
      },
      input: {
        collectionId: values.collectionId,
        operationId: props.operationId,
        name: values.name,
      },
    });
    const error = response.error || response.data?.updateOperationInDocumentCollection?.error;

    if (!error) {
      // Update tab title
      setTabState(state => ({
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === props.operationId ? { ...tab, title: values.name } : tab,
        ),
      }));
      props.close();
      toast({
        title: 'Operation Updated',
        description: 'Operation has been updated successfully',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <EditOperationModalContent
      fetching={updateOperationNameState.fetching}
      close={props.close}
      isOpen
      form={form}
      onSubmit={onSubmit}
    />
  );
};

export const EditOperationModalContent = (props: {
  fetching: boolean;
  isOpen: boolean;
  close: () => void;
  form: UseFormReturn<OperationFormValues>;
  onSubmit: (values: OperationFormValues) => void;
  opreationId?: string;
}): ReactElement => {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={() => {
        props.close();
        props.form.reset();
      }}
      width="lg"
      attrs={{ 'data-cy': 'edit-operation-modal' }}
      title="Edit Operation"
      description="Update the operation name"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            width="full"
            onClick={() => {
              props.close();
              props.form.reset();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={EDIT_OPERATION_FORM_ID}
            width="full"
            onSurface="raised"
            disabled={
              props.form.formState.isSubmitting ||
              !props.form.formState.isValid ||
              !props.form.formState.isDirty
            }
            data-cy="confirm"
          >
            Update Operation
          </Button>
        </>
      }
    >
      {!props.fetching && (
        <OperationForm form={props.form} onSubmit={props.onSubmit} id={EDIT_OPERATION_FORM_ID} />
      )}
    </Dialog>
  );
};
