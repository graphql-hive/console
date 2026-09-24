// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  RegisterDomainForm,
  RegisterDomainFormSchema,
  type RegisterDomainFormValues,
} from './register-domain-form';

/** Mirrors the sheet: the submit button lives in its footer, outside the form. */
function Harness(props: { onSubmit: (values: RegisterDomainFormValues) => void }) {
  const form = useForm({
    resolver: zodResolver(RegisterDomainFormSchema),
    defaultValues: { domainName: '' },
    mode: 'onSubmit',
  });
  return (
    <>
      <RegisterDomainForm form={form} onSubmit={props.onSubmit} />
      <button type="button" onClick={form.handleSubmit(props.onSubmit)}>
        Next
      </button>
    </>
  );
}

const domainInput = () => screen.getByLabelText('Domain Name') as HTMLInputElement;

async function submitWith(value: string) {
  await act(async () => {
    fireEvent.change(domainInput(), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  });
}

describe('RegisterDomainForm', () => {
  it('names the input for the e2e flow and explains it beside the label', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(domainInput().getAttribute('name')).toBe('domainName');
    expect(screen.getByRole('button', { name: 'About Domain Name' })).toBeTruthy();
  });

  it('applies the domain rules and hands a good domain over', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await submitWith('ab');
    expect(screen.getByText('Must be at least 3 characters long')).toBeTruthy();
    await submitWith('not a domain');
    expect(screen.getByText('Invalid domain provided.')).toBeTruthy();
    await submitWith('Example.com');
    expect(screen.getByText('Invalid domain provided.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await submitWith('buzzcheck.dev');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ domainName: 'buzzcheck.dev' });
  });
});
