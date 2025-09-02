import { Title } from '@/components/ui/page';
import { CubeIcon } from '@radix-ui/react-icons';

export function ServiceHeading(props: { serviceName: string }) {
  if (props.serviceName.length === 0) {
    return null;
  }
  return (
    <Title className="flex flex-row items-center rounded border px-4 py-2">
      <CubeIcon className="mr-2" />
      <span>{props.serviceName}</span>
    </Title>
  );
}
