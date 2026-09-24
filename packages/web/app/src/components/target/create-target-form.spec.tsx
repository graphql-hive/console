// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CreateTargetForm,
  CreateTargetFormSchema,
  type CreateTargetFormValues,
} from './create-target-form';

function Harness(props: { onSubmit: (values: CreateTargetFormValues) => void | Promise<void> }) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(CreateTargetFormSchema),
    defaultValues: { targetSlug: '' },
  });
  return <CreateTargetForm form={form} onSubmit={props.onSubmit} />;
}

const slugInput = () => screen.getByPlaceholderText('my-target') as HTMLInputElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Create Target' }) as HTMLButtonElement;

describe('CreateTargetForm', () => {
  it('holds the button until the slug is between 2 and 50 characters', async () => {
    render(<Harness onSubmit={() => {}} />);
    expect(slugInput().getAttribute('name')).toBe('targetSlug');
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'a' } });
    });
    expect(screen.getByText('Target slug must be at least 2 characters long')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'a'.repeat(51) } });
    });
    expect(screen.getByText('Target slug must be at most 50 characters long')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'staging' } });
    });
    expect(document.querySelector('[data-form-message]')?.textContent).toBe('');
    expect(submitButton().disabled).toBe(false);
  });

  it('submits the slug and shows the submitting state until the handler settles', async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      (_values: CreateTargetFormValues) => new Promise<void>(r => (resolve = r)),
    );
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'staging' } });
    });
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ targetSlug: 'staging' });
    expect(
      (screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    await act(async () => {
      resolve();
    });
    expect(submitButton().disabled).toBe(false);
  });
});
