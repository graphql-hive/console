import { ReactElement } from 'react';
import { authenticated } from '@/components/authenticated-container';
import { SubHeader, Title } from '@/components/v2';
import { CreateOrganizationForm } from '@/components/v2/modals/create-organization';
import { withSessionProtection } from '@/lib/supertokens/guard';

function CreateOrgPage(): ReactElement {
  return (
    <>
      <Title title="Create Organization" />
      <SubHeader />
      <div className="h-full grow flex items-center">
        <div className="container w-1/3">
          <CreateOrganizationForm />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = withSessionProtection();

export default authenticated(CreateOrgPage);
