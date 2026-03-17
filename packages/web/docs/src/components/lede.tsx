import { cn } from '@theguild/components';

export type LedeProps = React.HTMLAttributes<HTMLParagraphElement>;

export function Lede(props: LedeProps) {
  return <div {...props} className={cn('sm:*:text-xl/8 md:*:text-2xl/8', props.className)} />;
}
