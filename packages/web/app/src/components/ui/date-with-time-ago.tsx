import { format } from 'date-fns';
import { TimeAgo } from '@/components/v2';

export function DateWithTimeAgo(props: {
  date: string;
  dateFormatStr?: string;
}): React.ReactElement {
  const { date, dateFormatStr = 'MMM d, yyyy' } = props;

  return (
    <>
      {format(date, dateFormatStr)}{' '}
      <span className="text-neutral-10 font-normal">
        (<TimeAgo date={date} />)
      </span>
    </>
  );
}
