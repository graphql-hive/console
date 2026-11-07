// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { RadioGroup } from './radio-group';
import { radioGroupStyles } from './radio-group.css';

const ITEMS = [
  { value: 'info', label: 'Info' },
  { value: 'critical', label: 'Critical' },
];

describe('RadioGroup', () => {
  it('steps the button fill up one notch on a raised surface', () => {
    const { rerender } = render(
      <RadioGroup variant="as-button" value="info" onValueChange={() => {}} items={ITEMS} />,
    );
    expect(screen.getAllByRole('radio')[0].className).toContain(
      radioGroupStyles.item({ variant: 'as-button', onSurface: 'base' }),
    );

    rerender(
      <RadioGroup
        variant="as-button"
        onSurface="raised"
        value="info"
        onValueChange={() => {}}
        items={ITEMS}
      />,
    );
    expect(screen.getAllByRole('radio')[0].className).toContain(
      radioGroupStyles.item({ variant: 'as-button', onSurface: 'raised' }),
    );
  });
});
