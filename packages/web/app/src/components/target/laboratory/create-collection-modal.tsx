import { ReactElement, useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  COLLECTION_FORM_ID,
  CollectionForm,
  CollectionFormSchema,
  type CollectionFormValues,
} from './collection-form';

const CollectionQuery = graphql(`
  query Collection($selector: TargetSelectorInput!, $id: ID!) {
    target(reference: { bySelector: $selector }) {
      id
      documentCollection(id: $id) {
        id
        name
        description
      }
    }
  }
`);

const CreateCollectionMutation = graphql(`
  mutation CreateCollection(
    $selector: TargetSelectorInput!
    $input: CreateDocumentCollectionInput!
  ) {
    createDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
        collection {
          id
          name
          description
          operations(first: 100) {
            edges {
              cursor
              node {
                id
                name
              }
              cursor
            }
          }
        }
      }
    }
  }
`);

const UpdateCollectionMutation = graphql(`
  mutation UpdateCollection(
    $selector: TargetSelectorInput!
    $input: UpdateDocumentCollectionInput!
  ) {
    updateDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        updatedTarget {
          id
          documentCollections {
            edges {
              node {
                id
                name
              }
              cursor
            }
          }
        }
        collection {
          id
          name
          description
          operations(first: 100) {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`);

export function CreateCollectionModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  collectionId?: string;
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { isOpen, toggleModalOpen, collectionId } = props;
  const [mutationCreate, mutateCreate] = useMutation(CreateCollectionMutation);
  const [mutationUpdate, mutateUpdate] = useMutation(UpdateCollectionMutation);

  const [{ data, error: collectionError, fetching: loadingCollection }] = useQuery({
    query: CollectionQuery,
    variables: {
      id: collectionId!,
      selector: {
        targetSlug,
        organizationSlug,
        projectSlug,
      },
    },
    pause: !collectionId,
  });

  const errorCombined = mutationCreate.error || collectionError || mutationUpdate.error;
  const fetching = loadingCollection;

  const form = useForm<CollectionFormValues>({
    mode: 'onChange',
    resolver: zodResolver(CollectionFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!collectionId) {
      form.reset();
    } else if (data) {
      const { documentCollection } = data.target!;
      if (documentCollection) {
        void form.setValue('name', documentCollection.name);
        void form.setValue('description', documentCollection.description || '');
      }
    }
  }, [data, collectionId]);

  async function onSubmit(values: CollectionFormValues) {
    const { error } = collectionId
      ? await mutateUpdate({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          input: {
            collectionId,
            name: values.name,
            description: values.description,
          },
        })
      : await mutateCreate({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          input: values,
        });
    if (!error || errorCombined) {
      form.reset();
      toggleModalOpen();
    }
  }

  return (
    <CreateCollectionModalContent
      isOpen={isOpen}
      toggleModalOpen={toggleModalOpen}
      onSubmit={onSubmit}
      form={form}
      collectionId={collectionId}
      fetching={fetching}
    />
  );
}

export function CreateCollectionModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onSubmit: (values: CollectionFormValues) => void;
  form: UseFormReturn<CollectionFormValues>;
  collectionId?: string;
  fetching: boolean;
}) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      width="lg"
      attrs={{ 'data-cy': 'create-collection-modal' }}
      title={`${props.collectionId ? 'Update' : 'Create'} Shared Collection`}
      description={
        props.collectionId
          ? 'Update the shared collection name and description'
          : 'Create a shared collection that everyone in the organization can access'
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            width="full"
            onClick={() => props.toggleModalOpen()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={COLLECTION_FORM_ID}
            width="full"
            onSurface="raised"
            disabled={props.form.formState.isSubmitting || !props.form.formState.isValid}
            data-cy="confirm"
          >
            {props.collectionId ? 'Update' : 'Add'}
          </Button>
        </>
      }
    >
      {!props.fetching && <CollectionForm form={props.form} onSubmit={props.onSubmit} />}
    </Dialog>
  );
}
