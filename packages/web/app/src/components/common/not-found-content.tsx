import ghost from '../../../public/images/figures/ghost.svg?url';
import { useRouter } from '@tanstack/react-router';
import { Button } from '../ui/button';

export function NotFoundContent({
  heading,
  subheading,
  includeBackButton = true,
}: {
  heading: React.ReactNode;
  subheading: React.ReactNode;
  includeBackButton?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-2.5 py-6">
      <img src={ghost} alt="Ghost illustration" width="200" height="200" className="drag-none" />
      <h2 className="text-xl font-bold">{heading}</h2>
      <h3 className="font-semibold">{subheading}</h3>
      {includeBackButton && (
        <Button variant="secondary" className="mt-2" onClick={router.history.back}>
          Go back
        </Button>
      )}
    </div>
  );
}
