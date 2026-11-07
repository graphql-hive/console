// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { ErrorComponent } from './error';
import { errorStyles } from './error.css';

vi.mock('@sentry/react', () => ({ captureException: () => {}, flush: async () => true }));
vi.mock('@/lib/auth/use-session', () => ({
  useSession: () => ({ loading: false, doesSessionExist: true, userId: 'user-1' }),
}));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ navigate: () => {} }) }));

/** The nearest ancestor (or the element) carrying every class of a possibly composed style. */
function closestWith(element: Element, classes: string): Element | null {
  const wanted = classes.split(' ');
  let current: Element | null = element;
  while (current && !wanted.every(c => current!.classList.contains(c)))
    current = current.parentElement;
  return current;
}

describe('ErrorComponent', () => {
  it('positions the sign-out button inside the error block', () => {
    render(<ErrorComponent error={new Error('boom')} />);

    const button = screen.getByRole('button', { name: /Sign out/ });
    // The sign-out corner is absolutely positioned, and the error block is the positioned
    // ancestor it is placed against: the error renders inside a layout, so without one the button
    // would land on top of the header.
    const absolute = closestWith(button, errorStyles.signOut);
    expect(absolute).toBeTruthy();
    const positioned = closestWith(absolute!.parentElement!, errorStyles.root);
    expect(positioned).toBeTruthy();
    expect(positioned!.contains(screen.getByText('Oops, something went wrong.'))).toBe(true);
  });
});
