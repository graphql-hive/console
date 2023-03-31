import { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from 'urql';
import { Button, Heading, Modal } from '@/components/v2';
import { TrashIcon } from '@/components/v2/icon';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DeleteOrganizationDocument } from '@/graphql';
import { useRouteSelector } from '@/lib/hooks';

const DeleteOrganizationModal_OrganizationFragment = graphql(`
  fragment DeleteOrganizationModal_OrganizationFragment on Organization {
    cleanId
  }
`);

export const DeleteOrganizationModal = ({
  isOpen,
  toggleModalOpen,
  ...props
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organization: FragmentType<typeof DeleteOrganizationModal_OrganizationFragment>;
}): ReactElement => {
  const organization = useFragment(
    DeleteOrganizationModal_OrganizationFragment,
    props.organization,
  );
  const [, mutate] = useMutation(DeleteOrganizationDocument);
  const router = useRouteSelector();
  const { replace } = useRouter();

  return (
    <Modal
      open={isOpen}
      onOpenChange={toggleModalOpen}
      className="flex flex-col items-center gap-5"
    >
      <TrashIcon className="h-24 w-24 text-red-500 opacity-70" />
      <Heading>Delete organization</Heading>
      <p className="text-sm text-gray-500">
        Are you sure you wish to delete this organization? This action is irreversible!
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
              },
            });
            toggleModalOpen();
            void replace(`/${organization.cleanId}`);
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};
