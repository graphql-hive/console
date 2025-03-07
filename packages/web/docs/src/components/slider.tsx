'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@theguild/components';

const svgHref = new URL('./code-icon-white.svg', import.meta.url).toString();

export interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  counter: string;
  deadZone?: string;
}
export function Slider({ counter, className, deadZone, style, ...rest }: SliderProps) {
  const sliderProper = (
    <div
      ref={ref => {
        if (ref) polyfillSlider(ref, '--val');
      }}
      className={cn(
        'hive-slider relative h-10 flex-1 select-none [container-type:inline-size]',
        className,
      )}
      style={style}
    >
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        // for Safari
        tabIndex={0}
        className="h-10 w-full opacity-0 hover:cursor-grab active:cursor-grabbing"
        {...rest}
      />

      <div // fill
        className="bg-beige-300 pointer-events-none absolute top-[calc(50%-4px)] h-2 w-full rounded-lg [clip-path:inset(0_0_0_0_round_8px)] after:absolute after:inset-0 after:left-[-120%] after:w-[120%] after:translate-x-[calc(var(--val)*1cqi)] after:bg-blue-600"
      />

      <div // indicator
        style={{
          // Tailwind 4 doesn't allow to write this in a class, because
          // --tw-translate-x has syntax: <length> | <percentage>, and this
          // mixes units, so I don't know what CSS type that is.
          transform: 'translateX(calc(var(--val) * (100cqi - 100%) / 100))',
        }}
        className={cn(
          'after:text-green-1000 pointer-events-none absolute left-0 top-0 z-20 flex size-10 select-none items-center justify-center rounded-full bg-blue-600 text-center after:pointer-events-auto after:absolute after:top-[calc(-100%+3px)] after:whitespace-nowrap after:rounded-full after:bg-blue-200 after:px-3 after:py-1 after:font-medium',
          counter,
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          className="absolute -top-full translate-y-[23px] text-blue-200"
        >
          <path d="M0 8L6 0L12 8L6 16L0 8Z" />
        </svg>
        <img src={svgHref} width={24} height={24} alt="" />
      </div>

      <style jsx>{`
        @property --val {
          syntax: '<integer>';
          initial-value: 0;
          inherits: true;
        }
        @supports (animation-timeline: scroll()) and (animation-range: 0 100%) {
          .hive-slider {
            timeline-scope: --thumb;
            animation: progress both linear;
            animation-direction: reverse;
            animation-timeline: --thumb;
            animation-range: contain;
          }
          @keyframes progress {
            to {
              --val: 100;
            }
          }
          input {
            overflow: hidden;
          }
          ::-webkit-slider-thumb {
            view-timeline: --thumb inline;
          }
        }

        @supports not (font: -apple-system-body) {
          div,
          div:after {
            transition: transform var(--hive-ease-overshoot-far) 500ms;
          }

          @container (width >= 512px) {
            div,
            div:after {
              transition: transform var(--hive-ease-overshoot-a-bit) 500ms;
            }
          }
        }
      `}</style>
    </div>
  );

  return !deadZone ? (
    sliderProper
  ) : (
    <div className="flex w-full">
      <button
        className="z-10"
        style={{ width: deadZone }}
        onClick={event => {
          const input = event.currentTarget.parentElement!.querySelector(
            'input',
          ) as HTMLInputElement;

          input.value = '0';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }}
      >
        <div className="h-2 w-[calc(100%+4px)] rounded-l-lg bg-blue-600" />
      </button>
      {sliderProper}
    </div>
  );
}

/**
 * We're using CSS scroll-driven animations to make the animation
 * smoother. This is a polyfill for browsers that don't support it.
 * https://caniuse.com/?search=scroll()
 */
function polyfillSlider(element: HTMLElement, cssProperty: `--${string}`) {
  if (CSS.supports('(animation-timeline: view()) and (animation-range: 0 100%)')) {
    return;
  }

  const input = element.querySelector('[type=range]') as HTMLInputElement;

  const sync = () => {
    const val = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));

    element.style.setProperty(cssProperty, Math.round(val * 100).toString());
  };

  input.addEventListener('input', sync);

  input.addEventListener('pointerdown', ({ x, y }) => {
    const { left, top, height, width } = input.getBoundingClientRect();
    const vertical = height > width;
    const range = Number(input.max) - Number(input.min);
    const ratio = vertical ? (y - top) / height : (x - left) / width;
    const val = Number(input.min) + Math.floor(range * ratio);
    input.value = val.toString();
    sync();
  });

  sync();
}
