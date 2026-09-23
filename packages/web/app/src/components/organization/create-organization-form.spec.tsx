// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CreateOrganizationForm,
  CreateOrganizationFormSchema,
  type CreateOrganizationFormValues,
} from './create-organization-form';

function Harness(props: {
  onSubmit: (values: CreateOrganizationFormValues) => void | Promise<void>;
  isPending?: boolean;
}) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(CreateOrganizationFormSchema),
    defaultValues: { slug: '' },
    disabled: props.isPending,
  });
  return <CreateOrganizationForm form={form} onSubmit={props.onSubmit} />;
}

const slugInput = () => screen.getByPlaceholderText('my-organization') as HTMLInputElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Create Organization' }) as HTMLButtonElement;

describe('CreateOrganizationForm', () => {
  it('names the slug input for the e2e helper and holds the button until the slug is valid', async () => {
    render(<Harness onSubmit={() => {}} />);
    expect(slugInput().getAttribute('name')).toBe('slug');
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'My Org' } });
    });
    expect(
      screen.getByText('Slug can only contain lowercase letters, numbers and dashes'),
    ).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'my-org' } });
    });
    expect(document.querySelector('[data-form-message]')?.textContent).toBe('');
    expect(submitButton().disabled).toBe(false);
  });

  it('caps the slug at 50 characters', async () => {
    render(<Harness onSubmit={() => {}} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'a'.repeat(51) } });
    });
    expect(screen.getByText('Slug must be less than 50 characters')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
  });

  it('submits the slug and shows the creating state while the handler runs', async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      (_values: CreateOrganizationFormValues) => new Promise<void>(r => (resolve = r)),
    );
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'my-org' } });
    });
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ slug: 'my-org' });
    expect(screen.getByText('Creating...')).toBeTruthy();

    await act(async () => {
      resolve();
    });
    expect(screen.queryByText('Creating...')).toBeNull();
  });

  it('disables the slug input while the mutation is in flight', () => {
    render(<Harness onSubmit={() => {}} isPending />);
    expect(slugInput().disabled).toBe(true);
  });
});
