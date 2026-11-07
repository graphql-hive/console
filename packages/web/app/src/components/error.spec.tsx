// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { ErrorComponent } from './error';
import * as styles from './error.css';

vi.mock('@sentry/react', () => ({ captureException: () => {}, flush: async () => true }));
vi.mock('@/lib/auth/use-session', () => ({
  useSession: () => ({ loading: false, doesSessionExist: true, userId: 'user-1' }),
}));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ navigate: () => {} }) }));

describe('ErrorComponent', () => {
  it('positions the sign-out button inside the error block', () => {
    render(<ErrorComponent error={new Error('boom')} />);

    const button = screen.getByRole('button', { name: /Sign out/ });
    // The sign-out corner is absolutely positioned, and the error block is the positioned
    // ancestor it is placed against: the error renders inside a layout, so without one the button
    // would land on top of the header.
    const absolute = button.closest(`.${styles.errorComponentDiv2}`);
    expect(absolute).toBeTruthy();
    const positioned = absolute!.parentElement?.closest(`.${styles.errorComponentDiv}`);
    expect(positioned).toBeTruthy();
    expect(positioned!.contains(screen.getByText('Oops, something went wrong.'))).toBe(true);
  });
});
