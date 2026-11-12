// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Slider } from './slider';

function RangeSlider(props: { onValueCommitted?: (value: [number, number]) => void }) {
  const [value, setValue] = useState<[number, number]>([10, 90]);
  return (
    <Slider
      min={0}
      max={100}
      value={value}
      onValueChange={setValue}
      onValueCommitted={props.onValueCommitted}
      aria-label="Duration"
    />
  );
}

describe('Slider', () => {
  it('commits once per key press with the settled range', () => {
    const onValueCommitted = vi.fn();
    render(<RangeSlider onValueCommitted={onValueCommitted} />);

    const minimum = screen.getByRole('slider', { name: 'Duration minimum' });
    fireEvent.keyDown(minimum, { key: 'ArrowRight' });

    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenCalledWith([11, 90]);
  });

  it('keeps working without a commit handler', () => {
    render(<RangeSlider />);
    const maximum = screen.getByRole('slider', { name: 'Duration maximum' });
    fireEvent.keyDown(maximum, { key: 'ArrowLeft' });
    expect(maximum.getAttribute('aria-valuenow')).toBe('89');
  });
});
