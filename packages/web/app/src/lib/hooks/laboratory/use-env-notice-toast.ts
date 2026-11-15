import { useEffect } from 'react';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { consumeEnvNotice } from '@/lib/laboratory-snapshot';

/** Shows the one-time notice that env vars from the old shared session were not carried over. */
export function useEnvNoticeToast() {
  const { toast } = useToast();

  useEffect(() => {
    if (consumeEnvNotice()) {
      toast({
        title: 'Env vars are now saved per target',
        description: "Set them again here or let this target's preflight script fill them.",
      });
    }
  }, [toast]);
}
