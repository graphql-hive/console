// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { PageSkeleton, SectionSkeleton } from './page-skeleton';

describe('page skeletons', () => {
  it.each([
    ['PageSkeleton', PageSkeleton],
    ['SectionSkeleton', SectionSkeleton],
  ])('%s announces one loading status and hides its shapes', (_name, Component) => {
    render(<Component />);
    const status = screen.getByRole('status', { name: 'Loading' });
    expect(status.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});

describe('announcing', () => {
  it.each([
    ['page', () => <PageSkeleton />],
    ['section', () => <SectionSkeleton />],
  ])('the %s skeleton carries text for the live region to read', (_, element) => {
    render(element());
    expect(screen.getByRole('status', { name: 'Loading' }).textContent).toContain('Loading');
  });
});
