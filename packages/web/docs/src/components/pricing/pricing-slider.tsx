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

  return (
    <label
      className={cn(
        'relative isolate block rounded-3xl border border-green-400 p-4 sm:p-8',
        className,
      )}
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
            onChange(value);
          }}
        />
        <span className="font-medium">{max}M</span>
      </div>
      <Root delayDuration={0}>
        <Trigger asChild>
          <CallToAction
            onClick={() => {}}
            variant="tertiary"
            className="mt-6 md:absolute md:right-8 md:top-8 md:mt-0"
            id="operations-button"
          >
            <BookIcon /> Learn about operations
          </CallToAction>
        </Trigger>
        <Content
          side="top"
          align="center"
          className="border-beige-400 bg-beige-100 text-green-1000 z-50 m-2 max-w-[420px] overflow-visible rounded-2xl border px-4 py-3 shadow-md"
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
