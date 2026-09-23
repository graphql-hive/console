// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  RegistryTokenForm,
  RegistryTokenFormSchema,
  type RegistryTokenFormValues,
} from './registry-token-form';

function Harness(props: {
  onSubmit: (values: RegistryTokenFormValues) => void;
  onCancel?: () => void;
  noPermissionsSelected?: boolean;
}) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(RegistryTokenFormSchema),
    defaultValues: { tokenDescription: '' },
  });
  return (
    <RegistryTokenForm
      form={form}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel ?? (() => {})}
      noPermissionsSelected={props.noPermissionsSelected ?? false}
      permissions={<div>scope picker</div>}
    />
  );
}

const formElement = () =>
  document.querySelector('form[data-cy="create-registry-token-form"]') as HTMLFormElement;
const descriptionInput = () => screen.getByLabelText('Token description') as HTMLInputElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Generate Token' }) as HTMLButtonElement;

async function type(value: string) {
  await act(async () => {
    fireEvent.change(descriptionInput(), { target: { value } });
  });
}

describe('RegistryTokenForm', () => {
  it('keeps the e2e hooks inside the form and shows the scope picker under its disclosure', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(formElement().querySelector('[data-cy="description"]')).toBe(descriptionInput());
    expect(formElement().querySelector('[data-cy="submit"]')).toBe(submitButton());
    expect(screen.getByText('Registry & Usage')).toBeTruthy();
    expect(screen.getByText('scope picker')).toBeTruthy();
  });

  it('applies the description rules and holds the button until a scope is picked too', async () => {
    const { rerender } = render(<Harness onSubmit={() => {}} noPermissionsSelected />);
    await type('a');
    expect(screen.getByText('Token description must be at least 2 characters long')).toBeTruthy();
    await type('bad token!');
    expect(
      screen.getByText(
        'Token description restricted to alphanumerical characters, spaces and . , _ - / &',
      ),
    ).toBeTruthy();
    await type('ci token');
    expect(submitButton().disabled).toBe(true);

    rerender(<Harness onSubmit={() => {}} noPermissionsSelected={false} />);
    expect(submitButton().disabled).toBe(false);
  });

  it('hands over the description and lets Cancel through', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onSubmit={onSubmit} onCancel={onCancel} />);
    await type('ci token');
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ tokenDescription: 'ci token' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
