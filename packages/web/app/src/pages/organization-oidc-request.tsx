import { Lock } from 'lucide-react';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { useRouter } from '@tanstack/react-router';
import * as styles from './organization-oidc-request.css';

export function OrganizationOIDCRequestPage(props: { oidcId: string; redirectToPath: string }) {
  const router = useRouter();

  return (
    <>
      <Meta title="Single sign-on" />
      <LayoutContent>
        <div className={styles.organizationOIDCRequestPageDiv}>
          <Card variants={{ onSurface: 'raised' }}>
            <div className={styles.organizationOIDCRequestPageDiv2}>
              <Lock className={styles.organizationOIDCRequestPageLock} />
              <div className={styles.organizationOIDCRequestPageDiv3}>
                <Heading>Single sign-on</Heading>
                <span className={styles.organizationOIDCRequestPageSpan}>
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
