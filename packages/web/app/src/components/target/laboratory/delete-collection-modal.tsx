import { useMutation } from 'urql';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';

const DeleteCollectionMutation = graphql(`
  mutation DeleteCollection($selector: TargetSelectorInput!, $id: ID!) {
    deleteDocumentCollection(selector: $selector, id: $id) {
      error {
        message
      }
      ok {
        deletedId
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      }
    }
  }
`);

export type DeleteCollectionMutationType = typeof DeleteCollectionMutation;

export function DeleteCollectionModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  collectionId: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { toast } = useToast();
  const { isOpen, toggleModalOpen, collectionId } = props;
  const [, mutate] = useMutation(DeleteCollectionMutation);

  const handleDelete = async () => {
    const { error } = await mutate({
      id: collectionId,
      selector: {
        targetSlug,
        organizationSlug,
        projectSlug,
      },
    });
    toggleModalOpen();
    if (error) {
      toast({
        title: 'Failed to delete collection',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Collection deleted',
        description: 'The collection has been successfully deleted',
        variant: 'default',
      });
    }
  };

  return (
    <DeleteCollectionModalContent
      isOpen={isOpen}
      toggleModalOpen={toggleModalOpen}
      handleDelete={handleDelete}
    />
  );
}

export function DeleteCollectionModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  handleDelete: () => void;
}) {
  return (
    <AlertDialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      attrs={{ 'data-cy': 'delete-collection-modal' }}
      title="Delete Collection"
      description={
        <>
          Are you sure you wish to delete this collection?
          <br />
          <strong>This action is irreversible!</strong>
        </>
      }
      confirm={{
        label: 'Delete',
        variant: 'destructive',
        onClick: props.handleDelete,
        'data-cy': 'confirm',
      }}
    />
  );
}
