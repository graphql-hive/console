import { format } from 'date-fns';
import { TimeAgo } from '@/components/ui/time-ago';
import { dateWithTimeAgoStyles } from './date-with-time-ago.css';

export function DateWithTimeAgo(props: {
  date: string;
  dateFormatStr?: string;
}): React.ReactElement {
  const { date, dateFormatStr = 'MMM d, yyyy' } = props;

  return (
    <>
      {format(date, dateFormatStr)}{' '}
      <span className={dateWithTimeAgoStyles.timeAgo}>
        (<TimeAgo date={date} />)
      </span>
    </>
  );
}
