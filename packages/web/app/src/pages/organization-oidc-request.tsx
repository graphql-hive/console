import { Lock } from 'lucide-react';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { useRouter } from '@tanstack/react-router';

export function OrganizationOIDCRequestPage(props: { oidcId: string; redirectToPath: string }) {
  const router = useRouter();

  return (
    <>
      <Meta title="Single sign-on" />
      <LayoutContent>
        <div className="my-6">
          <Card variants={{ onSurface: 'raised' }}>
            <div className="flex min-h-140 flex-col items-center justify-center gap-y-6">
              <Lock className="size-20 stroke-warning" />
              <div className="flex flex-col gap-y-2 text-center">
                <Heading>Single sign-on</Heading>
                <span className="text-center text-sm font-medium text-fg-secondary">
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
