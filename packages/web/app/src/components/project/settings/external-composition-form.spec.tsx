// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  ExternalCompositionForm,
  ExternalCompositionFormSchema,
  type ExternalCompositionFormValues,
} from './external-composition-form';

function Harness(props: {
  onSubmit: (values: ExternalCompositionFormValues) => void;
  endpoint?: string;
  error?: string;
}) {
  const form = useForm({
    resolver: zodResolver(ExternalCompositionFormSchema),
    mode: 'onChange',
    defaultValues: { endpoint: props.endpoint ?? '', secret: '' },
  });
  return (
    <ExternalCompositionForm
      form={form}
      onSubmit={props.onSubmit}
      endpointStatus={props.endpoint ? <span>reachable</span> : null}
      error={props.error}
      submitLabel="Save Configuration"
    />
  );
}

const endpointInput = () => screen.getByLabelText('HTTP Endpoint') as HTMLInputElement;
const secretInput = () => screen.getByLabelText('Secret') as HTMLInputElement;
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

describe('ExternalCompositionForm', () => {
  it('labels both fields with their explanations behind icons and shows the last error', () => {
    render(<Harness onSubmit={() => {}} error="Endpoint unreachable" />);
    expect(endpointInput().tagName).toBe('INPUT');
    expect(secretInput().type).toBe('password');
    expect(screen.getByRole('button', { name: 'About HTTP Endpoint' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About Secret' })).toBeTruthy();
    expect(screen.getByText('Endpoint unreachable')).toBeTruthy();
  });

  it('shows the endpoint status beside a saved endpoint until the form is edited', async () => {
    render(<Harness onSubmit={() => {}} endpoint="https://composer.example.com" />);
    expect(screen.getByText('reachable')).toBeTruthy();
    await act(async () => {
      fireEvent.change(secretInput(), { target: { value: 'new-secret' } });
    });
    expect(screen.queryByText('reachable')).toBeNull();
  });

  it('applies the URL and secret rules, then hands both over', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(endpointInput(), { target: { value: 'nope' } });
      fireEvent.change(secretInput(), { target: { value: 'a' } });
    });
    expect(screen.getByText('Invalid URL')).toBeTruthy();
    expect(screen.getByText('Too short')).toBeTruthy();
    await act(async () => {
      submit();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(endpointInput(), { target: { value: 'https://composer.example.com' } });
      fireEvent.change(secretInput(), { target: { value: 'shared-secret' } });
    });
    await act(async () => {
      submit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      endpoint: 'https://composer.example.com',
      secret: 'shared-secret',
    });
  });
});
