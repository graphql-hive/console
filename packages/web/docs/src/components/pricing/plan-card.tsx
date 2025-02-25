import { ReactElement, ReactNode } from 'react';
import { CallToAction, cn } from '@theguild/components';

export interface PlanCardProps {
  name: string;
  description: string;
  price: ReactNode | string;
  features: ReactNode;
  linkText: string;
  linkOnClick?: () => void;
  adjustable: boolean;
  highlighted: boolean;
}

export function PlanCard(props: PlanCardProps): ReactElement {
  return (
    <article
      className={cn(
        'relative isolate rounded-3xl bg-white p-4 shadow-[inset_0_0_0_1px_theme(colors.green.400)] sm:p-8',
        'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[linear-gradient(#fff,#fff),linear-gradient(to_bottom,#E1FF00,#DEDACF,#68A8B6)] before:p-[4px] before:opacity-0 before:transition-[opacity] before:duration-500 before:content-[""] before:[background-clip:content-box,padding-box]',
        props.highlighted && 'before:opacity-100',
      )}
    >
      <header className="text-green-800">
        <div className="flex flex-row items-center gap-2">
          <h2 className="text-2xl font-medium">{props.name}</h2>
          {props.adjustable && (
            <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-sm font-medium leading-5">
              Adjust your plan at any time
            </span>
          )}
        </div>
        <p className="mt-2">{props.description}</p>
      </header>
      <div className="mt-4 text-5xl leading-[56px] tracking-[-0.48px]">{props.price}</div>
      <div className="mt-4">
        <CallToAction
          variant="primary"
          {...(props.linkOnClick
            ? {
                href: '#',
                onClick: event => {
                  event.preventDefault();
                  props.linkOnClick?.();
                },
              }
            : { href: 'https://app.graphql-hive.com' })}
        >
          {props.linkText}
        </CallToAction>
      </div>
      <ul className="mt-4 text-green-800">{props.features}</ul>
    </article>
  );
}
