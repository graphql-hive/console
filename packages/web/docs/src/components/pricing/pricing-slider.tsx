'use client';

import { useState } from 'react';
import { cn, ContactTextLink } from '@theguild/components';
import { Slider } from '../slider';

export function PricingSlider({ className, ...rest }: { className?: string }) {
  const min = 1;
  const max = 300;

  const [millionsOfOperations, setMillionsOfOperations] = useState(min);

  return (
    <label className={cn(className, 'block')} {...rest}>
      <div className="text-green-1000 font-medium">Expected monthly operations?</div>
      <div className="text-green-1000 flex items-center gap-2 pt-12 text-sm">
        <span className="font-medium">{min}M</span>
        <Slider
          min={min}
          max={max}
          step={1}
          defaultValue={min}
          // 10$ base price + 10$ per 1M
          style={{ '--ops': min, '--price': 'calc(10 + var(--ops) * 10)' }}
          counter="after:content-[''_counter(ops)_'M_operations,_$'_counter(price)_'_/_month'] after:[counter-set:ops_calc(var(--ops))_price_calc(var(--price))]"
          onChange={event => {
            const value = event.currentTarget.valueAsNumber;
            setMillionsOfOperations(value);
            event.currentTarget.parentElement!.style.setProperty('--ops', `${value}`);
          }}
        />
        <span className="font-medium">{max}M</span>
      </div>
      <p
        className="mt-4 rounded-xl bg-green-100 p-3 transition"
        style={{ opacity: millionsOfOperations >= max * 0.95 ? 1 : 0 }}
      >
        <span className="font-medium">Running {max}M+ operations?</span>
        <br />
        <ContactTextLink>Talk to us</ContactTextLink>
      </p>
    </label>
  );
}
