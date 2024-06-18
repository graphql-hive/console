import { ReactElement, useEffect } from 'react';
import { useFormik } from 'formik';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Callout, Input, Modal } from '@/components/v2';
import { graphql } from '@/gql';

const CollectionQuery = graphql(`
  query Collection($selector: TargetSelectorInput!, $id: ID!) {
    target(selector: $selector) {
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
  organizationId: string;
  projectId: string;
  targetId: string;
}): ReactElement {
  const { isOpen, toggleModalOpen, collectionId } = props;
  const [mutationCreate, mutateCreate] = useMutation(CreateCollectionMutation);
  const [mutationUpdate, mutateUpdate] = useMutation(UpdateCollectionMutation);

  const [{ data, error: collectionError, fetching: loadingCollection }] = useQuery({
    query: CollectionQuery,
    variables: {
      id: collectionId!,
      selector: {
        target: props.targetId,
        organization: props.organizationId,
        project: props.projectId,
      },
    },
    pause: !collectionId,
  });

  const error = mutationCreate.error || collectionError || mutationUpdate.error;
  const fetching = loadingCollection;

  useEffect(() => {
    if (!collectionId) {
      resetForm();
    } else if (data) {
      const { documentCollection } = data.target!;

      if (documentCollection) {
        void setValues({
          name: documentCollection.name,
          description: documentCollection.description || '',
        });
      }
    }
  }, [data, collectionId]);

  const {
    handleSubmit,
    values,
    handleChange,
    errors,
    touched,
    isSubmitting,
    setValues,
    resetForm,
  } = useFormik({
    initialValues: {
      name: '',
      description: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required(),
      description: Yup.string(),
    }),
    async onSubmit(values) {
      const { error } = collectionId
        ? await mutateUpdate({
            selector: {
              target: props.targetId,
              organization: props.organizationId,
              project: props.projectId,
            },
            input: {
              collectionId,
              name: values.name,
              description: values.description,
            },
          })
        : await mutateCreate({
            selector: {
              target: props.targetId,
              organization: props.organizationId,
              project: props.projectId,
            },
            input: values,
          });
      if (!error) {
        resetForm();
        toggleModalOpen();
      }
    },
  });

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen}>
      {!fetching && (
        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <Heading className="text-center">
            {collectionId ? 'Update' : 'Create'} Shared Collection
          </Heading>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="name">
              Collection Name
            </label>
            <Input
              data-cy="input.name"
              name="name"
              placeholder="My Collection"
              value={values.name}
              onChange={handleChange}
              isInvalid={!!(touched.name && errors.name)}
            />
            {touched.name && errors.name && (
              <div className="text-sm text-red-500">{errors.name}</div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="description">
              Collection Description
            </label>

            <Input
              data-cy="input.description"
              name="description"
              value={values.description}
              onChange={handleChange}
              isInvalid={!!(touched.description && errors.description)}
            />
            {touched.description && errors.description && (
              <div className="text-sm text-red-500">{errors.description}</div>
            )}
            <Callout type="info" className="mt-0">
              This collection will be available to everyone in the organization
            </Callout>
          </div>

          {error && <div className="text-sm text-red-500">{error.message}</div>}

          <div className="flex w-full gap-2">
            <Button
              type="button"
              size="lg"
              className="w-full justify-center"
              onClick={toggleModalOpen}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="w-full justify-center"
              variant="primary"
              disabled={isSubmitting}
              data-cy="confirm"
            >
              {collectionId ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
