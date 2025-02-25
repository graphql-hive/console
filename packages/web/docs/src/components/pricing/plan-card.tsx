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
        'rounded-3xl p-4 shadow-[inset_0_0_0_1px] shadow-green-400 sm:p-8',
        props.highlighted && 'shadow-primary shadow-[inset_0_0_0_4px]',
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
