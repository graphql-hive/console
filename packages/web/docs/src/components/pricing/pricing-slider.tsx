'use client';

import { CallToAction, cn } from '@theguild/components';
import { BookIcon } from '../book-icon';
import { Slider } from '../slider';

export function PricingSlider({ className, ...rest }: { className?: string }) {
  const min = 1;
  const max = 300;

  return (
    <label
      className={cn('relative block rounded-3xl border border-green-400 p-4 md:p-8', className)}
      {...rest}
    >
      <div className="text-green-1000 items-center text-2xl font-medium md:flex md:h-12 md:w-[calc(100%-260px)]">
        How many operations per month do you need?
      </div>
      <div className="text-green-1000 flex items-center gap-5 pt-12 text-sm">
        <span className="font-medium">{min}M</span>
        <Slider
          deadZone="16px"
          min={min}
          max={max}
          step={1}
          defaultValue={min}
          // 10$ base price + 10$ per 1M
          style={{ '--ops': min, '--price': 'calc(10 + var(--ops) * 10)' }}
          counter="after:content-[''_counter(ops)_'M_ops,_$'_counter(price)_'_/_month'] after:[counter-set:ops_calc(var(--ops))_price_calc(var(--price))]"
          onChange={event => {
            const value = event.currentTarget.valueAsNumber;
            event.currentTarget.parentElement!.style.setProperty('--ops', `${value}`);
          }}
        />
        <span className="font-medium">{max}M</span>
      </div>
      <CallToAction
        href="#todo-faq-operations-question"
        variant="tertiary"
        className="mt-6 md:absolute md:right-8 md:top-8 md:mt-0"
      >
        <BookIcon /> Learn about operations
      </CallToAction>
    </label>
  );
}
