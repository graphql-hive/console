// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SignUpForm, SignUpFormSchema, type SignUpFormValues } from './sign-up-form';

function Harness(props: { onSubmit: (values: SignUpFormValues) => void; isPending?: boolean }) {
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    disabled: props.isPending,
  });
  return (
    <SignUpForm
      form={form}
      onSubmit={props.onSubmit}
      submit={
        <button type="submit" disabled={props.isPending}>
          Create an account
        </button>
      }
    />
  );
}

const labels: Record<keyof SignUpFormValues, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  password: 'Password',
};

function fill(values: SignUpFormValues) {
  for (const name of Object.keys(values) as (keyof SignUpFormValues)[]) {
    fireEvent.change(screen.getByLabelText(labels[name]), { target: { value: values[name] } });
  }
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

describe('SignUpForm', () => {
  it('names every input the way the e2e helper fills them', () => {
    render(<Harness onSubmit={() => {}} />);
    for (const name of Object.keys(labels) as (keyof SignUpFormValues)[]) {
      expect(screen.getByLabelText(labels[name]).getAttribute('name')).toBe(name);
    }
  });

  it('shows the email and password rules on an empty submit and does not call out', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      submit();
    });
    expect(screen.getByText('Invalid email address')).toBeTruthy();
    expect(screen.getByText('Password must be at least 10 characters long.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reports the first password rule a weak password breaks', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fill({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'longenough1!',
      });
      submit();
    });
    expect(screen.getByText('Password must contain at least one uppercase letter.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits all four fields once they pass', async () => {
    const onSubmit = vi.fn();
    const values = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'Longenough1!',
    };
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fill(values);
      submit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual(values);
    expect(document.querySelectorAll('[data-form-message]:not(:empty)').length).toBe(0);
  });

  it('disables the fields and the button while pending', () => {
    render(<Harness onSubmit={() => {}} isPending />);
    expect((screen.getByLabelText('First name') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Password') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Create an account' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
