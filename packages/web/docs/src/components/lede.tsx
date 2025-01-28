import { cn } from '@theguild/components';

export interface LedeProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Lede(props: LedeProps) {
  return <div {...props} className={cn('sm:*:text-xl/6 md:*:text-2xl/8', props.className)} />;
}
