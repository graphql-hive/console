import { Lock } from 'lucide-react';
import { OrganizationLayout } from '@/components/layouts/organization';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { isProviderEnabled } from '@/lib/supertokens/thirdparty';
import { Navigate, useRouter } from '@tanstack/react-router';

export function OrganizationOIDCRequestPage(props: {
  organizationSlug: string;
  oidcId: string;
  redirectToPath: string;
}) {
  const router = useRouter();

  if (!isProviderEnabled('oidc')) {
    return <Navigate to={props.redirectToPath} />;
  }

  return (
    <>
      <Meta title="Single sign-on" />
      <OrganizationLayout organizationSlug={props.organizationSlug} minimal>
        <Card className="my-6 min-h-140 flex flex-col items-center justify-center gap-y-6 p-5">
          <Lock className="size-20 stroke-amber-400" />
          <div className="flex flex-col gap-y-2 text-center">
            <Heading>Single sign-on</Heading>
            <span className="text-center text-sm font-medium text-gray-500">
              To access the organization's resources, authenticate your account with single sign-on.
            </span>
          </div>
          <Button
            className="min-w-32"
            onClick={() => {
              void router.navigate({
                to: '/auth/oidc',
                search: {
                  id: props.oidcId,
                  redirectToPath: props.redirectToPath,
                },
              });
            }}
          >
            Continue
          </Button>
        </Card>
      </OrganizationLayout>
    </>
  );
}
