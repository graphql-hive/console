'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@theguild/components';

const svgHref = new URL('./code-icon-green.svg', import.meta.url).toString();

export interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  counter: string;
}
export function Slider({ counter, className, style, ...rest }: SliderProps) {
  return (
    <div
      ref={ref => {
        if (ref) polyfillSlider(ref, '--val');
      }}
      className={cn('relative h-10 flex-1 [container-type:inline-size]', className)}
      style={{
        ...style,
        '--ease':
          'linear(0 0%, 0.5007 7.21%, 0.7803 12.29%, 0.8883 14.93%, 0.9724 17.63%, 1.0343 20.44%, 1.0754 23.44%, 1.0898 25.22%, 1.0984 27.11%, 1.1014 29.15%, 1.0989 31.4%, 1.0854 35.23%, 1.0196 48.86%, 1.0043 54.06%, 0.9956 59.6%, 0.9925 68.11%, 1 100%)',
      }}
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
        className="pointer-events-none absolute top-[calc(50%-4px)] h-2 w-full rounded-lg bg-green-100 [clip-path:inset(0_0_0_0_round_8px)] after:absolute after:inset-0 after:left-[-120%] after:w-[120%] after:translate-x-[calc(var(--val)*1cqi)] after:bg-green-300"
      />

      <div // indicator
        style={{
          // Tailwind 4 doesn't allow to write this in a class, because
          // --tw-translate-x has syntax: <length> | <percentage>, and this
          // mixes units, so I don't know what CSS type that is.
          transform: 'translateX(calc(var(--val) * (100cqi - 100%) / 100))',
        }}
        className={cn(
          'after:text-green-1000 pointer-events-none absolute left-0 top-0 flex size-10 select-none items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 text-center after:pointer-events-auto after:absolute after:top-[calc(-100%+3px)] after:whitespace-nowrap after:rounded-full after:bg-green-200 after:px-3 after:py-1 after:font-medium',
          counter,
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          className="absolute -top-full translate-y-[23px] text-green-200"
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
          :has(> input) {
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
            transition: transform var(--ease) 500ms;
          }
        }
      `}</style>
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
