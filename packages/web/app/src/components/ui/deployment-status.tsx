import { format } from 'date-fns';

export function DeploymentStatusLabel(props: {
  status: string;
  retiredAt?: string | null;
}): React.ReactElement {
  const { status, retiredAt } = props;

  if (status === 'retired' && retiredAt) {
    return (
      <span>
        {status} ({format(retiredAt, 'MMM d, yyyy HH:mm:ss')})
      </span>
    );
  }

  return <>{status}</>;
}
