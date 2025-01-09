import { cn } from '@theguild/components';

export interface LedeProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Lede(props: LedeProps) {
  // pt-2 is temporary -- it aligns the text with TOC
  return <div {...props} className={cn('pt-2 *:text-2xl/8', props.className)} />;
}
