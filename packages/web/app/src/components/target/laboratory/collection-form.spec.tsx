// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  COLLECTION_FORM_ID,
  CollectionForm,
  CollectionFormSchema,
  type CollectionFormValues,
} from './collection-form';

/** Mirrors the dialog: the submit button sits in its footer, outside the form. */
function Harness(props: { onSubmit: (values: CollectionFormValues) => void }) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(CollectionFormSchema),
    defaultValues: { name: '', description: '' },
  });
  return (
    <>
      <CollectionForm form={form} onSubmit={props.onSubmit} />
      <button type="submit" form={COLLECTION_FORM_ID} disabled={!form.formState.isValid}>
        Add
      </button>
    </>
  );
}

// The button is enabled by the form's validity, which the resolver settles a tick after mount.
async function renderForm(onSubmit: (values: CollectionFormValues) => void) {
  render(<Harness onSubmit={onSubmit} />);
  await act(async () => {});
}

const nameInput = () => screen.getByLabelText('Collection Name') as HTMLInputElement;
const addButton = () => screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;

describe('CollectionForm', () => {
  it('names the inputs for the e2e flow and holds the footer button until the name is valid', async () => {
    await renderForm(() => {});
    expect(nameInput().getAttribute('name')).toBe('name');
    expect(screen.getByLabelText('Collection Description').getAttribute('name')).toBe(
      'description',
    );
    expect(addButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'a' } });
    });
    expect(screen.getByText('Collection name must be at least 2 characters long')).toBeTruthy();
    expect(addButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'a'.repeat(51) } });
    });
    expect(screen.getByText('Collection name must be at most 50 characters long')).toBeTruthy();

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'Smoke tests' } });
    });
    expect(addButton().disabled).toBe(false);
  });

  it('is submitted by the footer button with the name and an optional description', async () => {
    const onSubmit = vi.fn();
    await renderForm(onSubmit);
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'Smoke tests' } });
    });
    await act(async () => {
      fireEvent.click(addButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Smoke tests', description: '' });
  });
});
