import { useEffect } from 'react';
import { authClient } from '@/lib/auth';
import { captureException } from '@sentry/react';
import { useRouter } from '@tanstack/react-router';

export function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    void authClient
      .signOut()
      .then(() => {
        void router.navigate({
          to: '/',
        });
      })
      .catch(error => {
        console.error(error);
        captureException(error);
      });
  });

  return null;
}
