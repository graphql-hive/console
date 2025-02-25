import { ReactElement, ReactNode } from 'react';
import { cn } from '@theguild/components';

export interface PlanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  description: string;
  price: ReactNode | string;
  features: ReactNode;
  adjustable: boolean;
  highlighted: boolean;
  callToAction: ReactNode;
}

export function PlanCard({
  name,
  description,
  price,
  features,
  adjustable,
  highlighted,
  callToAction,
  className,
  ...rest
}: PlanCardProps): ReactElement {
  return (
    <article
      className={cn(
        'relative isolate rounded-3xl bg-white p-4 shadow-[inset_0_0_0_1px_theme(colors.green.400)] sm:p-8',
        'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[linear-gradient(#fff,#fff),linear-gradient(to_bottom,#E1FF00,#DEDACF,#68A8B6)] before:p-[4px] before:opacity-0 before:transition-[opacity] before:duration-500 before:content-[""] before:[background-clip:content-box,padding-box]',
        highlighted && 'before:opacity-100',
        className,
      )}
      {...rest}
    >
      <header className="text-green-800">
        <div className="flex flex-row items-center gap-2">
          <h2 className="text-2xl font-medium">{name}</h2>
          {adjustable && (
            <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-sm font-medium leading-5">
              Adjust your plan at any time
            </span>
          )}
        </div>
        <p className="mt-2">{description}</p>
      </header>
      <div className="mt-4 text-5xl font-medium leading-[56px] tracking-[-0.48px]">{price}</div>
      <div className="mt-4 flex *:grow">{callToAction}</div>
      <ul className="mt-4 text-green-800">{features}</ul>
    </article>
  );
}
