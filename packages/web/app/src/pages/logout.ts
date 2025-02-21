import { useEffect } from 'react';
import { authClient  } from '@/lib/auth';
import { captureException } from '@sentry/react';
import { useRouter } from '@tanstack/react-router';

export function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void router.navigate({
            to: '/',
          });
        },
        onError(error) {
          console.error(error);
          captureException(error);
        }
      }
    })
  }, [router]);

  return null;
}
