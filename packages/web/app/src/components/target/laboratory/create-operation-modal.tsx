import { ReactElement } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/base/button/button';
import { graphql } from '@/gql';
import {
  DocumentCollectionOperation,
  useCollections,
} from '@/lib/hooks/laboratory/use-collections';
import { useEditorContext } from '@graphiql/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { OperationForm, OperationFormSchema, type OperationFormValues } from './operation-form';

const CREATE_OPERATION_FORM_ID = 'create-operation-form';

const CreateOperationMutation = graphql(`
  mutation CreateOperation(
    $selector: TargetSelectorInput!
    $input: CreateDocumentCollectionOperationInput!
  ) {
    createOperationInDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        operation {
          id
          name
        }
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                operations {
                  edges {
                    node {
                      id
                    }
                    cursor
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export type CreateOperationMutationType = typeof CreateOperationMutation;

export function CreateOperationModal(props: {
  isOpen: boolean;
  close: () => void;
  onSaveSuccess: (args: { id: string; name: string }) => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const { toast } = useToast();
  const { isOpen, close, onSaveSuccess } = props;
  const [, mutateCreate] = useMutation(CreateOperationMutation);

  const { collections, fetching } = useCollections({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });
  const { queryEditor, variableEditor, headerEditor } = useEditorContext({
    nonNull: true,
  });

  const form = useForm<OperationFormValues>({
    mode: 'onChange',
    resolver: zodResolver(OperationFormSchema),
    defaultValues: {
      name: '',
      collectionId: '',
    },
    disabled: fetching,
  });

  async function onSubmit(values: OperationFormValues) {
    const result = await mutateCreate({
      selector: {
        targetSlug: props.targetSlug,
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
      },
      input: {
        name: values.name,
        collectionId: values.collectionId,
        query: queryEditor?.getValue() ?? '',
        variables: variableEditor?.getValue(),
        headers: headerEditor?.getValue(),
      },
    });
    const error = result.error || result.data?.createOperationInDocumentCollection.error;

    if (error) {
      toast({
        title: 'Failed to create operation',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const operation = result?.data?.createOperationInDocumentCollection.ok?.operation;
      if (operation) {
        onSaveSuccess({ id: operation.id, name: operation.name });
      }
      form.reset();
      close();
      toast({
        title: 'Operation created',
        description: `Operation "${values.name}" added to collection "${collections.find(c => c.id === values.collectionId)?.name}"`,
      });
    }
  }

  return (
    <CreateOperationModalContent
      close={close}
      onSubmit={onSubmit}
      isOpen={isOpen}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      fetching={fetching}
      form={form}
      collections={collections}
    />
  );
}

export function CreateOperationModalContent(props: {
  isOpen: boolean;
  close: () => void;
  onSubmit: (values: OperationFormValues) => void;
  organizationSlug: string;
  projectSlug: string;
  form: UseFormReturn<OperationFormValues>;
  targetSlug: string;
  fetching: boolean;
  collections: DocumentCollectionOperation[];
}): ReactElement {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={() => {
        props.close();
        props.form.reset();
      }}
      width="lg"
      attrs={{ 'data-cy': 'create-operation-modal' }}
      title="Create Operation"
      description="Create a new operation and add it to a collection"
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
            form={CREATE_OPERATION_FORM_ID}
            width="full"
            onSurface="raised"
            disabled={props.form.formState.isSubmitting || !props.form.formState.isValid}
          >
            Add Operation
          </Button>
        </>
      }
    >
      {!props.fetching && (
        <OperationForm
          form={props.form}
          onSubmit={props.onSubmit}
          id={CREATE_OPERATION_FORM_ID}
          collections={props.collections}
        />
      )}
    </Dialog>
  );
}
