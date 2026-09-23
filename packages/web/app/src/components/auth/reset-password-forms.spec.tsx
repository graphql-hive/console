// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  NewPasswordForm,
  NewPasswordFormSchema,
  ResetPasswordEmailForm,
  ResetPasswordFormSchema,
  type NewPasswordFormValues,
  type ResetPasswordFormValues,
} from './reset-password-forms';

function EmailHarness(props: {
  onSubmit: (values: ResetPasswordFormValues) => void;
  initialEmail?: string;
  isPending?: boolean;
}) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: { email: props.initialEmail ?? '' },
    disabled: props.isPending,
  });
  return (
    <ResetPasswordEmailForm
      form={form}
      onSubmit={props.onSubmit}
      submit={
        <button type="submit" disabled={props.isPending}>
          Email me
        </button>
      }
    />
  );
}

function PasswordHarness(props: {
  onSubmit: (values: NewPasswordFormValues) => void;
  isPending?: boolean;
}) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewPasswordFormSchema),
    defaultValues: { newPassword: '' },
    disabled: props.isPending,
  });
  return (
    <NewPasswordForm
      form={form}
      onSubmit={props.onSubmit}
      submit={
        <button type="submit" disabled={props.isPending}>
          Change password
        </button>
      }
    />
  );
}

describe('ResetPasswordEmailForm', () => {
  it('starts with the email the sign-in page handed over', () => {
    render(<EmailHarness onSubmit={() => {}} initialEmail="ada@example.com" />);
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.value).toBe('ada@example.com');
    expect(input.getAttribute('name')).toBe('email');
  });

  it('rejects a bad email without calling out, then submits a good one', async () => {
    const onSubmit = vi.fn();
    render(<EmailHarness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Email me' }));
    });
    expect(screen.getByText('Invalid email address')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Email me' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'ada@example.com' });
    expect(screen.queryByText('Invalid email address')).toBeNull();
  });

  it('disables the field and the button while pending', () => {
    render(<EmailHarness onSubmit={() => {}} isPending />);
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Email me' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('NewPasswordForm', () => {
  it('holds a weak password back and submits one that passes the rules', async () => {
    const onSubmit = vi.fn();
    render(<PasswordHarness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'longenough1!' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    });
    expect(screen.getByText('Password must contain at least one uppercase letter.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('New password'), {
        target: { value: 'Longenough1!' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ newPassword: 'Longenough1!' });
  });

  it('keeps the field a password input, named for the form', () => {
    render(<PasswordHarness onSubmit={() => {}} />);
    const input = screen.getByLabelText('New password') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.getAttribute('name')).toBe('newPassword');
  });

  it('disables the field and the button while pending', () => {
    render(<PasswordHarness onSubmit={() => {}} isPending />);
    expect((screen.getByLabelText('New password') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Change password' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
