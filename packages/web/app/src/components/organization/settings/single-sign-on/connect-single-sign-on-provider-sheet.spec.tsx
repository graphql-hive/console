// @vitest-environment jsdom
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectSingleSignOnProviderSheet } from './connect-single-sign-on-provider-sheet';

function renderSheet() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ConnectSingleSignOnProviderSheet
          open
          onClose={() => {}}
          onOpenChangeComplete={() => {}}
          initialValues={null}
          onSave={async () => ({ type: 'success' })}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const forms = () => document.querySelectorAll('form[data-form-oidc]');
const input = (name: string) =>
  document.querySelector(`form[data-form-oidc] input[name="${name}"]`) as HTMLInputElement;

describe('ConnectSingleSignOnProviderSheet', () => {
  it('keeps one provider form across the tabs and unlocks the endpoints on Manual', () => {
    renderSheet();
    expect(forms()).toHaveLength(1);
    const form = forms()[0];
    expect(screen.getByLabelText('Metadata URL')).toBeTruthy();
    expect(input('token_endpoint').disabled).toBe(true);
    fireEvent.change(input('clientId'), { target: { value: 'hive' } });

    const manual = screen.getByRole('tab', { name: 'Manual' });
    expect(manual.hasAttribute('data-button-oidc-manual')).toBe(true);
    fireEvent.click(manual);

    expect(forms()).toHaveLength(1);
    expect(forms()[0]).toBe(form);
    expect(screen.queryByLabelText('Metadata URL')).toBeNull();
    expect(input('token_endpoint').disabled).toBe(false);
    expect(input('clientId').value).toBe('hive');
  });
});
