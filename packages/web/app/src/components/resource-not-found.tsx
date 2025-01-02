import { Button } from '@/components/ui/button';
import { useRouter } from '@tanstack/react-router';

export function ResourceNotFoundComponent(props: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex max-w-[960px] flex-col items-center gap-x-6 sm:flex-row">
        <img src="/images/figures/connection.svg" alt="Ghost" className="block size-[200px]" />
        <div className="grow text-center sm:text-left">
          <h1 className="text-xl font-semibold">{props.title}</h1>
          <div className="mt-2">
            <div className="text-sm">
              <p>It seems like you do not have access to this resource or it does not exist.</p>
              <p>Please check again with your organization admin.</p>
            </div>
            <Button variant="secondary" onClick={router.history.back} className="mt-4">
              Go back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
