import ghost from '../../../public/images/figures/ghost.svg?url';
import { useRouter } from '@tanstack/react-router';
import { Button } from '../ui/button';

export function NotFoundContent(props: { heading: React.ReactNode; subheading: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-2.5 py-6">
      <img src={ghost} alt="Ghost illustration" width="200" height="200" className="drag-none" />
      <h2 className="text-xl font-bold">{props.heading}</h2>
      <h3 className="font-semibold">{props.subheading}</h3>
      <Button variant="secondary" className="mt-2" onClick={router.history.back}>
        Go back
      </Button>
    </div>
  );
}
