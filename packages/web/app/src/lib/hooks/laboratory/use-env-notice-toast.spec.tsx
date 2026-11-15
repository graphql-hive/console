// @vitest-environment jsdom
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { render, screen } from '@testing-library/react';
import { useEnvNoticeToast } from './use-env-notice-toast';

const ENV_NOTICE_PENDING = 'hive:laboratory:envNoticePending';
const TITLE = 'Env vars are now saved per target';

function Lab() {
  useEnvNoticeToast();
  return null;
}

const renderLab = () =>
  render(
    <ToastProvider>
      <Lab />
    </ToastProvider>,
  );

afterEach(() => {
  localStorage.clear();
});

// Base UI repeats toast text in a live region, so the text is queried with *AllBy*.
describe('useEnvNoticeToast', () => {
  it('shows the notice once when the old session had env vars', () => {
    localStorage.setItem(ENV_NOTICE_PENDING, 'true');

    renderLab().unmount();
    expect(localStorage.getItem(ENV_NOTICE_PENDING)).toBeNull();

    renderLab();
    expect(screen.queryAllByText(TITLE)).toHaveLength(0);
  });

  it('shows the notice in the app toaster', () => {
    localStorage.setItem(ENV_NOTICE_PENDING, 'true');

    renderLab();

    expect(screen.getAllByText(TITLE).length).toBeGreaterThan(0);
  });

  it('shows nothing when no notice is pending', () => {
    renderLab();

    expect(screen.queryAllByText(TITLE)).toHaveLength(0);
  });
});
