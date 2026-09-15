import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { timeRelative } from './shared-helpers';

const EXPIRED_TEXT = 'EXPIRED';

export function TokenExpiration(props: { expiresAt: string | null }) {
  if (props.expiresAt) {
    const expiresDate = new Date(props.expiresAt);
    const text = timeRelative(expiresDate, undefined, EXPIRED_TEXT);

    if (text === EXPIRED_TEXT) {
      return (
        <Tooltip
          trigger={<span className="text-red-500">{text}</span>}
          content={expiresDate.toLocaleString()}
          align="start"
        />
      );
    }
    return text;
  }
  return 'never';
}
