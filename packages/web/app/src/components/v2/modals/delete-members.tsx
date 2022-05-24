import { ReactElement } from 'react';
import { useMutation } from 'urql';

import { Button, Heading, Modal } from '@/components/v2';
import { TrashIcon } from '@/components/v2/icon';
import { DeleteOrganizationMembersDocument } from '@/graphql';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';

export const DeleteMembersModal = ({
  isOpen,
  toggleModalOpen,
  memberIds,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  memberIds: string[];
}): ReactElement => {
  const router = useRouteSelector();
  const [mutation, mutate] = useMutation(DeleteOrganizationMembersDocument);
  const isSingle = memberIds.length === 1;

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen} className="flex flex-col items-center gap-5">
      <TrashIcon className="h-24 w-24 text-red-500 opacity-70" />
      <Heading>Delete member{isSingle ? '' : 's'}</Heading>
      <p className="text-sm text-gray-500">
        Are you sure you wish to delete {isSingle ? 'this user' : `${memberIds.length} users`}?
      </p>
      {mutation.error && <div className="text-sm text-red-500">{mutation.error.message}</div>}
      <div className="flex w-full gap-2">
        <Button type="button" size="large" block onClick={toggleModalOpen}>
          Cancel
        </Button>
        <Button
          size="large"
          block
          danger
          onClick={async () => {
            const { error } = await mutate({
              selector: {
                organization: router.organizationId,
                users: memberIds,
              },
            });
            if (!error) {
              toggleModalOpen();
            }
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};
