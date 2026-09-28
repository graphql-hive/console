// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { PagePending, SectionPending } from './page-pending';

describe('pending states', () => {
  it.each([
    ['PagePending', PagePending],
    ['SectionPending', SectionPending],
  ])('%s is one spinner whose live region carries the word for screen readers', (_, Component) => {
    render(<Component />);
    const status = screen.getByRole('status', { name: 'Loading' });
    expect(status.textContent).toBe('Loading');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
