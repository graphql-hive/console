import { cn } from '@theguild/components';

export interface LedeProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Lede(props: LedeProps) {
  return <div {...props} className={cn('*:text-2xl/8', props.className)} />;
}
