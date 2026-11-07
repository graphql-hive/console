import { Lock } from 'lucide-react';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { useRouter } from '@tanstack/react-router';
import { organizationOidcRequestStyles } from './organization-oidc-request.css';

export function OrganizationOIDCRequestPage(props: {
  oidcId: string;
  slug: string;
  redirectToPath: string;
}) {
  const router = useRouter();

  return (
    <>
      <Meta title="Single sign-on" />
      <LayoutContent>
        <div className={organizationOidcRequestStyles.root}>
          <Card variants={{ onSurface: 'raised' }}>
            <div className={organizationOidcRequestStyles.body}>
              <Lock className={organizationOidcRequestStyles.icon} />
              <div className={organizationOidcRequestStyles.text}>
                <Heading>Single sign-on</Heading>
                <span className={organizationOidcRequestStyles.hint}>
                  To access the organization's resources, authenticate your account with single
                  sign-on.
                </span>
              </div>
              <Button
                onSurface="raised"
                onClick={() => {
                  void router.navigate({
                    to: '/auth/oidc',
                    search: {
                      id: props.oidcId,
                      slug: props.slug,
                      redirectToPath: props.redirectToPath,
                    },
                  });
                }}
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </LayoutContent>
    </>
  );
}
