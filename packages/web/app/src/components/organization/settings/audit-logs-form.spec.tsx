// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AuditLogsForm, AuditLogsFormSchema, type AuditLogsFormValues } from './audit-logs-form';

function Harness(props: { onSubmit: (values: AuditLogsFormValues) => void | Promise<void> }) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(AuditLogsFormSchema),
    defaultValues: { startDate: '2025-09-20', endDate: '2026-09-20' },
  });
  return <AuditLogsForm form={form} onSubmit={props.onSubmit} />;
}

// The button is enabled by the form's validity, which the resolver settles a tick after mount.
async function renderForm(onSubmit: (values: AuditLogsFormValues) => void | Promise<void>) {
  render(<Harness onSubmit={onSubmit} />);
  await act(async () => {});
}

const startInput = () => screen.getByLabelText('Start date') as HTMLInputElement;
const endInput = () => screen.getByLabelText('End date') as HTMLInputElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Generate Report' }) as HTMLButtonElement;

describe('AuditLogsForm', () => {
  it('starts on the range the page hands over, as date inputs', async () => {
    await renderForm(() => {});
    expect(startInput().type).toBe('date');
    expect(startInput().value).toBe('2025-09-20');
    expect(endInput().type).toBe('date');
    expect(endInput().value).toBe('2026-09-20');
    expect(submitButton().disabled).toBe(false);
  });

  it('submits the edited range and holds the button until the handler settles', async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn((_values: AuditLogsFormValues) => new Promise<void>(r => (resolve = r)));
    await renderForm(onSubmit);
    await act(async () => {
      fireEvent.change(startInput(), { target: { value: '2026-01-01' } });
    });
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ startDate: '2026-01-01', endDate: '2026-09-20' });
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      resolve();
    });
    expect(submitButton().disabled).toBe(false);
  });
});
