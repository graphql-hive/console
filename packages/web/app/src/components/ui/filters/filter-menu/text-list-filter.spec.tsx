// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextListPanel } from '../filter-dropdown/text-list-panel';
import { FilterChips } from './filter-menu';
import type { FilterDimension } from './types';

function Panel(props: { initial?: string[]; onChange?: (next: string[]) => void }) {
  const [values, setValues] = useState(props.initial ?? []);
  return (
    <TextListPanel
      label="Trace ID"
      values={values}
      onChange={next => {
        setValues(next);
        props.onChange?.(next);
      }}
    />
  );
}

const input = () => screen.getByRole('textbox', { name: 'Add trace id' }) as HTMLInputElement;

function paste(text: string) {
  fireEvent.paste(input(), { clipboardData: { getData: () => text } });
}

describe('TextListPanel', () => {
  it('adds the typed value on Enter and clears the input', () => {
    const onChange = vi.fn();
    render(<Panel onChange={onChange} />);

    fireEvent.change(input(), { target: { value: ' abc ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['abc']);
    expect(input().value).toBe('');
  });

  it('splits a paste on whitespace and commas', () => {
    const onChange = vi.fn();
    render(<Panel onChange={onChange} />);
    paste('a, b\nc  d');
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c', 'd']);
  });

  it('skips duplicates and blanks', () => {
    const onChange = vi.fn();
    render(<Panel initial={['a']} onChange={onChange} />);

    paste('a,,b, a');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);

    fireEvent.change(input(), { target: { value: 'b' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    fireEvent.change(input(), { target: { value: '   ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('removes one value, or all of them', () => {
    const onChange = vi.fn();
    render(<Panel initial={['a', 'b', 'c']} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove b' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe('text-list chip', () => {
  const traceIds = (values: string[], onChange = vi.fn()): FilterDimension => ({
    key: 'traceId',
    label: 'Trace ID',
    kind: 'text-list',
    values,
    onChange,
    countNoun: 'id',
  });

  it('renders no chip while the list is empty', () => {
    render(<FilterChips dimensions={[traceIds([])]} />);
    expect(screen.queryByRole('group', { name: 'Trace ID filter' })).toBeNull();
  });

  it('counts with the noun and clears from the X', () => {
    const onChange = vi.fn();
    const { rerender } = render(<FilterChips dimensions={[traceIds(['a'], onChange)]} />);
    expect(screen.getByRole('button', { name: '1 id' })).toBeTruthy();

    rerender(<FilterChips dimensions={[traceIds(['a', 'b', 'c'], onChange)]} />);
    expect(screen.getByRole('button', { name: '3 ids' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Trace ID filter' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
