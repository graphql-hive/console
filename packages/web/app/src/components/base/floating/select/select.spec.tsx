// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Select } from './select';

const OPTIONS = [
  { value: 'default', label: 'Default Graph' },
  { value: 'mobile', label: 'mobile' },
];

describe('Select', () => {
  // The trigger is labelled by a hidden label and by itself, the APG select-only combobox
  // pattern, so browsers announce "Contract, mobile". The name computation used here stops at
  // the label for a self-referenced combobox, so the wiring is asserted rather than the result.
  function expectLabelledByItself(trigger: HTMLElement, label: string) {
    const [labelId, selfId] = (trigger.getAttribute('aria-labelledby') ?? '').split(' ');
    expect(selfId).toBe(trigger.id);
    expect(document.getElementById(labelId)?.textContent).toBe(label);
  }

  it('names the combobox with aria-label and keeps the selected option on it', () => {
    render(<Select options={OPTIONS} value="mobile" aria-label="Contract" />);
    const trigger = screen.getByRole('combobox', { name: 'Contract' });
    expect(trigger.textContent).toBe('mobile');
    expectLabelledByItself(trigger, 'Contract');
  });

  it('names a custom trigger the same way', () => {
    render(
      <Select
        options={OPTIONS}
        value="mobile"
        aria-label="Contract"
        trigger={<button type="button">mobile</button>}
      />,
    );
    expectLabelledByItself(screen.getByRole('combobox', { name: 'Contract' }), 'Contract');
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
