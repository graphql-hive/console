// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { ProjectType } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CreateProjectForm,
  CreateProjectFormSchema,
  type CreateProjectFormValues,
} from './create-project-form';

function Harness(props: { onSubmit: (values: CreateProjectFormValues) => void | Promise<void> }) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(CreateProjectFormSchema),
    defaultValues: { projectSlug: '', projectType: ProjectType.Single },
  });
  return <CreateProjectForm form={form} onSubmit={props.onSubmit} />;
}

const slugInput = () => screen.getByLabelText('Slug of your project') as HTMLInputElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Create Project' }) as HTMLButtonElement;

describe('CreateProjectForm', () => {
  it('keeps the e2e hooks on the form, the slug and the submit', () => {
    render(<Harness onSubmit={() => {}} />);
    const form = document.querySelector('form[data-cy="create-project-form"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('[data-cy="slug"]')).toBe(slugInput());
    expect(form!.querySelector('[data-cy="submit"]')).toBe(submitButton());
  });

  it('offers the three project types as a named group with Monolith picked', () => {
    render(<Harness onSubmit={() => {}} />);
    const group = screen.getByRole('group', { name: 'Project Type' });
    const radios = ['Monolith', 'Federation', 'Stitching'].map(name =>
      screen.getByRole('radio', { name }),
    );
    for (const radio of radios) {
      expect(group.contains(radio)).toBe(true);
    }
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');
  });

  it('holds the button until the slug is long enough', async () => {
    render(<Harness onSubmit={() => {}} />);
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'a' } });
    });
    expect(screen.getByText('Project slug must be at least 2 characters long')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'my-project' } });
    });
    expect(submitButton().disabled).toBe(false);
  });

  it('submits the slug with the picked type and shows the submitting state', async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      (_values: CreateProjectFormValues) => new Promise<void>(r => (resolve = r)),
    );
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.change(slugInput(), { target: { value: 'my-project' } });
      fireEvent.click(screen.getByRole('radio', { name: 'Federation' }));
    });
    expect(screen.getByRole('radio', { name: 'Federation' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      projectSlug: 'my-project',
      projectType: ProjectType.Federation,
    });
    expect(
      (screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    await act(async () => {
      resolve();
    });
    expect(submitButton().disabled).toBe(false);
  });
});
