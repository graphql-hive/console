import { AuthCard, AuthCardContent, AuthCardHeader } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { isProviderEnabled } from '@/lib/supertokens/thirdparty';
import { Navigate, useRouter } from '@tanstack/react-router';

export function AuthOIDCRequestPage(props: { oidcId: string; redirectToPath: string }) {
  const router = useRouter();

  if (!isProviderEnabled('oidc')) {
    return <Navigate to="/auth/sign-in" search={{ redirectToPath: props.redirectToPath }} />;
  }

  return (
    <>
      <Meta title="Single sign-on" />
      <AuthCard>
        <AuthCardHeader
          title="Single sign-on"
          description="To access the organization's resources, authenticate your account with single sign-on."
        />
        <AuthCardContent>
          <Button
            className="w-full"
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
        </AuthCardContent>
      </AuthCard>
    </>
  );
}
