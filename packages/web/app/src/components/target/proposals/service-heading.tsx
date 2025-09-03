import { Title } from '@/components/ui/page';
import { CubeIcon } from '@radix-ui/react-icons';

export function ServiceHeading(props: { serviceName: string }) {
  if (props.serviceName.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-row items-center border-b-2 px-4 py-2 text-base font-semibold">
      <CubeIcon className="mr-2" />
      <span>{props.serviceName}</span>
    </div>
  );
}
