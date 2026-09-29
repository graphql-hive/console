import { ReactElement } from 'react';
import { useMutation } from 'urql';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { useToast } from '@/components/base/toast/toast';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';

const DeleteOperationMutation = graphql(`
  mutation DeleteOperation($selector: TargetSelectorInput!, $id: ID!) {
    deleteOperationInDocumentCollection(selector: $selector, id: $id) {
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

export type DeleteOperationMutationType = typeof DeleteOperationMutation;

export function DeleteOperationModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  operationId: string;
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { toast } = useToast();
  const { isOpen, toggleModalOpen, operationId } = props;
  const [, mutate] = useMutation(DeleteOperationMutation);

  const handleDelete = async () => {
    const { error } = await mutate({
      id: operationId,
      selector: {
        targetSlug,
        organizationSlug,
        projectSlug,
      },
    });
    toggleModalOpen();
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Operation Deleted',
        description: 'The operation has been successfully deleted.',
        variant: 'default',
      });
    }
  };

  return (
    <DeleteOperationModalContent
      isOpen={isOpen}
      toggleModalOpen={toggleModalOpen}
      handleDelete={handleDelete}
    />
  );
}

export function DeleteOperationModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  handleDelete: () => void;
}): ReactElement {
  return (
    <AlertDialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      attrs={{ 'data-cy': 'delete-operation-modal' }}
      title="Delete Operation"
      description={
        <>
          Do you really want to delete this operation?
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
