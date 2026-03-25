import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { timeRelative } from './shared-helpers';

const EXPIRED_TEXT = 'EXPIRED';

export function TokenExpiration(props: { expiresAt: string | null }) {
  if (props.expiresAt) {
    const expiresDate = new Date(props.expiresAt);
    const text = timeRelative(expiresDate, undefined, EXPIRED_TEXT);

    if (text === EXPIRED_TEXT) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-red-500">{text}</TooltipTrigger>
            <TooltipContent align="start">{expiresDate.toLocaleString()}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return text;
  }
  return 'never';
}
