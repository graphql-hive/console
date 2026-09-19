// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Select } from './select';

const OPTIONS = [
  { value: 'default', label: 'Default Graph' },
  { value: 'mobile', label: 'mobile' },
];

describe('Select', () => {
  it('names the combobox with aria-label and echoes the selected option on it', () => {
    render(<Select options={OPTIONS} value="mobile" aria-label="Contract" />);
    const trigger = screen.getByRole('combobox', { name: 'Contract' });
    expect(trigger.textContent).toBe('mobile');
  });

  it('shows the label over the selected option, and the placeholder when nothing is selected', () => {
    const { rerender } = render(
      <Select options={OPTIONS} value="mobile" label="Sort by mobile" aria-label="Sort by" />,
    );
    expect(screen.getByRole('combobox').textContent).toBe('Sort by mobile');
    rerender(<Select options={OPTIONS} placeholder="Pick a contract" aria-label="Contract" />);
    expect(screen.getByRole('combobox').textContent).toBe('Pick a contract');
  });
});
