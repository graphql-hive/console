import { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from 'urql';

import { Button, Heading, Modal } from '@/components/v2';
import { TrashIcon } from '@/components/v2/icon';
import { DeleteProjectDocument } from '@/graphql';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';

export const DeleteProjectModal = ({
  isOpen,
  toggleModalOpen,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
}): ReactElement => {
  const [, mutate] = useMutation(DeleteProjectDocument);
  const router = useRouteSelector();
  const { replace } = useRouter();

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen} className="flex flex-col items-center gap-5">
      <TrashIcon className="h-24 w-24 text-red-500 opacity-70" />
      <Heading>Delete project</Heading>
      <p className="text-sm text-gray-500">
        Are you sure you wish to delete this project? This action is irreversible!
      </p>
      <div className="flex w-full gap-2">
        <Button type="button" size="large" block onClick={toggleModalOpen}>
          Cancel
        </Button>
        <Button
          size="large"
          block
          danger
          onClick={async () => {
            await mutate({
              selector: {
                organization: router.organizationId,
                project: router.projectId,
              },
            });
            toggleModalOpen();
            replace(`/${router.organizationId}`);
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};
