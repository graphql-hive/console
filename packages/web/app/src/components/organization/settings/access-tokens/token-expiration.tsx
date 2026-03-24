import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { timeRelative } from './shared-helpers';

export function TokenExpiration(props: { expiresAt: string | null }) {
  if (props.expiresAt) {
    const expiresDate = new Date(props.expiresAt);
    const text = timeRelative(expiresDate, undefined, 'expired');

    if (text === 'expired') {
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
