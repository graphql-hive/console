// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SlugForm, slugFormSchema, type SlugFormValues } from './slug-form';

function Harness(props: {
  noun?: 'Organization' | 'Project' | 'Target';
  onSubmit: (values: SlugFormValues) => void | Promise<void>;
}) {
  const form = useForm({
    mode: 'all',
    resolver: zodResolver(slugFormSchema(props.noun ?? 'Organization')),
    defaultValues: { slug: 'acme' },
  });
  return <SlugForm form={form} onSubmit={props.onSubmit} prefixText="app.example.com/" />;
}

const slugInput = () => screen.getByPlaceholderText('slug') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('SlugForm', () => {
  it('starts with the current slug behind its URL prefix', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(slugInput().value).toBe('acme');
    expect(slugInput().getAttribute('name')).toBe('slug');
    expect(screen.getByText('app.example.com/')).toBeTruthy();
  });

  it('flags a bad slug as you type and refuses to submit it', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'Acme Inc' } });
    });
    expect(
      screen.getByText('Slug can only contain lowercase letters, numbers and dashes'),
    ).toBeTruthy();
    expect(saveButton().disabled).toBe(false);

    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names the rule after the thing being renamed', async () => {
    render(<Harness noun="Project" onSubmit={() => {}} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: '' } });
    });
    expect(screen.getByText('Project slug is required')).toBeTruthy();
  });

  it('submits the new slug and holds Save until the handler settles', async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn((_values: SlugFormValues) => new Promise<void>(r => (resolve = r)));
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'acme-inc' } });
      fireEvent.click(saveButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ slug: 'acme-inc' });
    expect(saveButton().disabled).toBe(true);

    await act(async () => {
      resolve();
    });
    expect(saveButton().disabled).toBe(false);
  });
});
