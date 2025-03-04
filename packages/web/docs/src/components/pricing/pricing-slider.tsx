import { useRef, useState } from 'react';
import { Content, Root, Trigger } from '@radix-ui/react-tooltip';
import { CallToAction, cn } from '@theguild/components';
import { BookIcon } from '../book-icon';
import { Slider } from '../slider';

export function PricingSlider({
  className,
  onChange,
  ...rest
}: {
  className?: string;
  onChange: (value: number) => void;
}) {
  const min = 1;
  const max = 300;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement>(null);

  return (
    <label
      ref={rootRef}
      className={cn(
        'relative isolate block select-none rounded-3xl border border-green-400 p-4 [counter-set:ops_calc(var(--ops))_price_calc(var(--price))] sm:p-8',
        className,
      )}
      // 10$ base price + 10$ per 1M
      style={{ '--ops': min, '--price': 'calc(10 + var(--ops) * 10)' }}
      {...rest}
    >
      <div className="text-green-1000 items-center text-2xl font-medium md:flex md:h-12 md:w-[calc(100%-260px)]">
        <div className="w-0 max-w-fit grow-[calc(clamp(0,var(--ops)-1,1))] opacity-[calc(var(--ops)-1)] transition [transition-duration:calc(clamp(0,var(--ops)-1,1)*280ms)]">
          <span
            aria-hidden
            className="rounded-[40px] bg-blue-300 px-3 py-1 tabular-nums tracking-[-0.08em] before:content-[''_counter(ops)]"
          >
            M
          </span>
        </div>
        <div className="w-[calc(clamp(0,2-var(--ops),1)*111px)] shrink grow-0 whitespace-pre opacity-[calc(2-var(--ops))] transition [transition-duration:calc(clamp(0,2-var(--ops),1)*280ms)]">
          How many
        </div>
        <div className="whitespace-pre"> operations per month </div>
        <div className="whitespace-pre opacity-[calc(2-var(--ops))] transition [transition-duration:280ms]">
          do you need?
        </div>
      </div>
      <div className="text-green-1000 flex items-center gap-5 pt-12 text-sm">
        <span className="font-medium">{min}M</span>
        <Slider
          deadZone="16px"
          min={min}
          max={max}
          step={1}
          defaultValue={min}
          counter="after:content-['$'_counter(price)_'_/_month']"
          onChange={event => {
            const value = event.currentTarget.valueAsNumber;
            rootRef.current!.style.setProperty('--ops', `${value}`);
            onChange(value);
          }}
        />
        <span className="font-medium">{max}M</span>
      </div>
      <Root delayDuration={0} open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Trigger asChild>
          <CallToAction
            variant="tertiary"
            className="mt-6 md:absolute md:right-8 md:top-8 md:mt-0"
            id="operations-button"
            onClick={event => {
              // Radix doesn't open Tooltips on touch devices by design
              if (window.matchMedia('(hover: none)').matches) {
                event.preventDefault();
                setPopoverOpen(true);
              }
            }}
          >
            <BookIcon /> Learn about operations
          </CallToAction>
        </Trigger>
        <Content
          side="top"
          align="center"
          className="border-beige-400 bg-beige-100 text-green-1000 z-50 m-2 max-w-[328px] overflow-visible rounded-2xl border px-4 py-3 shadow-md sm:max-w-[420px]"
          avoidCollisions
        >
          Every GraphQL request that is processed by your GraphQL API and reported to GraphQL Hive.
          If your server receives 1M GraphQL requests, all of them will be reported to Hive
          (assuming no sampling).
        </Content>
      </Root>
    </label>
  );
}
