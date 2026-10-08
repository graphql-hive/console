import { format } from 'date-fns';
import { TimeAgo } from '@/components/ui/time-ago';

export function DateWithTimeAgo(props: {
  date: string;
  dateFormatStr?: string;
}): React.ReactElement {
  const { date, dateFormatStr = 'MMM d, yyyy' } = props;

  return (
    <>
      {format(date, dateFormatStr)}{' '}
      <span className="font-normal text-fg-secondary">
        (<TimeAgo date={date} />)
      </span>
    </>
  );
}
