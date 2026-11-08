// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { formatRange } from '../filter-dropdown/range-filter-chip';
import { normalizeRange, RangeFilterPanel } from '../filter-dropdown/range-filter-panel';
import { FilterChips } from './filter-menu';
import type { FilterDimension, RangeValue } from './types';

const bounds = { min: 0, max: 100_000 };

function duration(value: RangeValue, onChange = vi.fn()): FilterDimension {
  return { key: 'duration', label: 'Duration', kind: 'range', bounds, unit: 'ms', value, onChange };
}

describe('normalizeRange', () => {
  it('clamps to the bounds and turns an end at its bound into null', () => {
    expect(normalizeRange(-5, 200_000, bounds)).toEqual({ min: null, max: null });
    expect(normalizeRange(0, 500, bounds)).toEqual({ min: null, max: 500 });
  });

  it('puts the ends in order', () => {
    expect(normalizeRange(500, 100, bounds)).toEqual({ min: 100, max: 500 });
  });
});

describe('formatRange', () => {
  it('formats a closed range, a minimum only and a maximum only', () => {
    expect(formatRange({ min: 100, max: 1500 }, 'ms')).toBe('100–1,500 ms');
    expect(formatRange({ min: 100, max: null }, 'ms')).toBe('≥ 100 ms');
    expect(formatRange({ min: null, max: 500 }, 'ms')).toBe('≤ 500 ms');
  });
});

describe('range chip', () => {
  it('renders no chip while unbounded', () => {
    render(<FilterChips dimensions={[duration({ min: null, max: null })]} />);
    expect(screen.queryByRole('group', { name: 'Duration filter' })).toBeNull();
  });

  it('shows the range and clears both bounds from the X', () => {
    const onChange = vi.fn();
    render(<FilterChips dimensions={[duration({ min: 100, max: 500 }, onChange)]} />);
    expect(screen.getByRole('button', { name: '100–500 ms' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Duration filter' }));
    expect(onChange).toHaveBeenCalledWith({ min: null, max: null });
  });
});

describe('RangeFilterPanel', () => {
  function renderPanel(value: RangeValue) {
    const onChange = vi.fn();
    render(
      <RangeFilterPanel
        label="Duration"
        bounds={bounds}
        unit="ms"
        value={value}
        onChange={onChange}
      />,
    );
    return onChange;
  }

  it('commits a typed bound once, on Enter, not per keystroke', () => {
    const onChange = renderPanel({ min: null, max: null });
    const min = screen.getByLabelText('Min');

    fireEvent.change(min, { target: { value: '1' } });
    fireEvent.change(min, { target: { value: '100' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(min, { key: 'Enter' });
    fireEvent.blur(min);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ min: 100, max: null });
  });

  it('clears a bound when its input is emptied', () => {
    const onChange = renderPanel({ min: 100, max: 500 });
    const max = screen.getByLabelText('Max');

    fireEvent.change(max, { target: { value: '' } });
    fireEvent.blur(max);
    expect(onChange).toHaveBeenCalledWith({ min: 100, max: null });
  });

  it('ignores text that is not a number', () => {
    const onChange = renderPanel({ min: 100, max: 500 });
    const min = screen.getByLabelText('Min');

    fireEvent.change(min, { target: { value: 'abc' } });
    fireEvent.blur(min);
    expect(onChange).not.toHaveBeenCalled();
    expect((min as HTMLInputElement).value).toBe('100');
  });

  it('clears a bound when its thumb reaches the end of the track', () => {
    const onChange = renderPanel({ min: 100, max: 99_999 });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Duration maximum' }), {
      key: 'ArrowRight',
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ min: 100, max: null });
  });
});
