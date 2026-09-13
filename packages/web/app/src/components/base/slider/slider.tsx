import { Slider as BaseSlider } from '@base-ui/react/slider';
import { focusRing } from '../shared-styles';

type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** What the value is, for assistive tech; the visible label is the readout beside the slider. */
  'aria-label': string;
};

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  disabled,
  'aria-label': ariaLabel,
}: SliderProps) {
  return (
    <BaseSlider.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="flex w-full touch-none items-center data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      {/* Vertical padding widens the hit area past the 4px track. */}
      <BaseSlider.Control className="flex w-full cursor-pointer items-center py-2">
        <BaseSlider.Track className="bg-neutral-5 relative h-1 w-full select-none rounded-full">
          <BaseSlider.Indicator className="bg-accent rounded-full" />
          <BaseSlider.Thumb
            aria-label={ariaLabel}
            className={`bg-neutral-12 size-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${focusRing}`}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
