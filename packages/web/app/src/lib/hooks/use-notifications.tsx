import { useCallback } from 'react';
import { useToast } from '@chakra-ui/react';

export function useNotifications() {
  const toast = useToast({
    isClosable: true,
    duration: 5000,
    position: 'bottom-right',
  });

  return useCallback(
    (title: string, status: 'success' | 'error' | 'warning' | 'info') => {
      toast({ title, status });
    },
    [toast]
  );
}
