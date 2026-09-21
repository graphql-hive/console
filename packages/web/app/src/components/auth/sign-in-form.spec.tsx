// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SignInForm, SignInFormSchema, type SignInFormValues } from './sign-in-form';

function Harness(props: { onSubmit: (values: SignInFormValues) => void; isPending?: boolean }) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(SignInFormSchema),
    defaultValues: { email: '', password: '' },
    disabled: props.isPending,
  });
  return (
    <SignInForm
      form={form}
      onSubmit={props.onSubmit}
      submit={
        <button type="submit" disabled={props.isPending}>
          Sign in
        </button>
      }
      forgotPasswordLink={email => <a href={`#reset:${email}`}>Forgot your password?</a>}
    />
  );
}

describe('SignInForm', () => {
  it('hands the email typed so far to the reset link', async () => {
    render(<Harness onSubmit={() => {}} />);
    const link = () => screen.getByText('Forgot your password?');
    expect(link().getAttribute('href')).toBe('#reset:');
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    });
    expect(link().getAttribute('href')).toBe('#reset:ada@example.com');
  });

  it('rejects a bad email before calling out, then submits both fields', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getByText('Invalid email address')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'ada@example.com', password: 'hunter22' });
    expect(screen.queryByText('Invalid email address')).toBeNull();
  });

  it('keeps the reset link beside the password label and disables everything while pending', () => {
    render(<Harness onSubmit={() => {}} isPending />);
    expect(screen.getByText('Forgot your password?')).toBeTruthy();
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
