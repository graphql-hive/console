// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import type { DocumentCollectionOperation } from '@/lib/hooks/laboratory/use-collections';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OperationForm, OperationFormSchema, type OperationFormValues } from './operation-form';

const collections = [
  { id: 'col-1', name: 'Smoke tests', description: 'Runs on deploy', operations: { edges: [] } },
  { id: 'col-2', name: 'Playground', description: null, operations: { edges: [] } },
] as unknown as DocumentCollectionOperation[];

/** Mirrors the dialogs: the submit button sits in the footer, outside the form. */
function Harness(props: {
  onSubmit: (values: OperationFormValues) => void;
  collections?: DocumentCollectionOperation[];
  collectionId?: string;
}) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(OperationFormSchema),
    defaultValues: { name: '', collectionId: props.collectionId ?? '' },
  });
  return (
    <>
      <OperationForm
        form={form}
        onSubmit={props.onSubmit}
        id="operation-form"
        collections={props.collections}
      />
      <button type="submit" form="operation-form" disabled={!form.formState.isValid}>
        Save
      </button>
    </>
  );
}

const nameInput = () => screen.getByLabelText('Operation Name') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
const collectionLabel = 'Which collection would you like to save this operation to?';

describe('OperationForm', () => {
  it('shows the collection picker only when given collections, with its e2e hooks', () => {
    const { rerender } = render(<Harness onSubmit={() => {}} />);
    expect(nameInput().getAttribute('name')).toBe('name');
    expect(screen.queryByText(collectionLabel)).toBeNull();

    rerender(<Harness onSubmit={() => {}} collections={collections} />);
    const trigger = screen.getByLabelText(collectionLabel);
    expect(trigger.getAttribute('data-cy')).toBe('collection-select-trigger');
    expect(trigger.textContent).toContain('Select a Collection');
  });

  it('applies the name rules and holds the footer button until they pass', async () => {
    render(<Harness onSubmit={() => {}} collections={collections} collectionId="col-1" />);
    await act(async () => {});
    expect(saveButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'ab' } });
    });
    expect(screen.getByText('Operation name must be at least 3 characters long')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'a'.repeat(51) } });
    });
    expect(screen.getByText('Operation name must be less than 50 characters long')).toBeTruthy();

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'ListUsers' } });
    });
    expect(saveButton().disabled).toBe(false);
  });

  it('hands over the name with the chosen collection', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} collections={collections} collectionId="col-2" />);
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: 'ListUsers' } });
    });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'ListUsers', collectionId: 'col-2' });
  });
});
