// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SSOForm, SSOFormSchema, type SSOFormValues } from './sso-form';

function Harness(props: { onSubmit: (values: SSOFormValues) => void; isPending?: boolean }) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(SSOFormSchema),
    defaultValues: { slug: '' },
    disabled: props.isPending,
  });
  return (
    <SSOForm
      form={form}
      onSubmit={props.onSubmit}
      submit={
        <button type="submit" disabled={props.isPending}>
          Sign in
        </button>
      }
    />
  );
}

describe('SSOForm', () => {
  it('labels the slug input, names it for the e2e helper and explains it beside the label', () => {
    render(<Harness onSubmit={() => {}} />);
    const input = screen.getByLabelText('Organization slug') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('name')).toBe('slug');
    const hint = screen.getByRole('button', { name: 'About Organization slug' });
    expect(screen.getByText('Organization slug').contains(hint)).toBe(false);
  });

  it('hands the slug over lowercased', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Organization slug'), { target: { value: 'ACME' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ slug: 'acme' });
  });

  it('disables the field and the button while pending', () => {
    render(<Harness onSubmit={() => {}} isPending />);
    expect((screen.getByLabelText('Organization slug') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
