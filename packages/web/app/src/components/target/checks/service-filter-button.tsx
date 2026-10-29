import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router';

/** Narrows the checks list to one service. It only sets the filter; the row and the header already open the check. */
export function ServiceFilterButton(props: { serviceName: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn('truncate hover:underline', props.className)}
      aria-label={`Show only checks for ${props.serviceName}`}
      onClick={() =>
        void router.navigate({
          to: '.',
          search: { ...router.latestLocation.search, filter_service: props.serviceName },
          replace: true,
        })
      }
    >
      {props.serviceName}
    </button>
  );
}
