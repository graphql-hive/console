import { ReactElement } from 'react';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DottedBackground } from '@/components/ui/dotted-background';
import { Meta } from '@/components/ui/meta';
import { CreateOrganizationForm } from '@/components/ui/modals/create-organization';
import { HiveLogo } from '@/components/v2/icon';
import { Link, useRouter } from '@tanstack/react-router';

export function NewOrgPage(): ReactElement {
  const router = useRouter();

  const handleOnClick = (): void => {
    void router.navigate({
      to: '/logout',
    });
  };

  return (
    <>
      <Meta title="Create Organization" />
      <DottedBackground>
        <div className="flex h-full grow items-center">
          <Button variant="outline" onClick={handleOnClick} className="absolute right-6 top-6">
            <LogOutIcon className="mr-2 size-4" /> Sign out
          </Button>
          <Link to="/" className="absolute left-6 top-6">
            <HiveLogo className="size-10" />
          </Link>
          <CreateOrganizationForm />
        </div>
      </DottedBackground>
    </>
  );
}
