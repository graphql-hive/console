// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { SupportTicketPriority } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  NEW_TICKET_FORM_ID,
  NewTicketForm,
  NewTicketFormSchema,
  type NewTicketFormValues,
} from './new-ticket-form';

/** Mirrors the page: the submit button sits in the sheet footer, outside the form. */
function Harness(props: { onSubmit: (values: NewTicketFormValues) => void | Promise<void> }) {
  const form = useForm({
    resolver: zodResolver(NewTicketFormSchema),
    defaultValues: { subject: '', priority: SupportTicketPriority.Normal, description: '' },
  });
  return (
    <>
      <NewTicketForm form={form} onSubmit={props.onSubmit} />
      <button type="submit" form={NEW_TICKET_FORM_ID}>
        Submit
      </button>
    </>
  );
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

describe('NewTicketForm', () => {
  it('labels every field, groups the priorities with Normal picked, and explains the description', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(screen.getByLabelText('Subject').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: 'About Description' })).toBeTruthy();
    const group = screen.getByRole('group', { name: 'Priority level' });
    for (const name of ['Normal', 'High', 'Urgent']) {
      expect(group.contains(screen.getByRole('radio', { name }))).toBe(true);
    }
    expect(screen.getByRole('radio', { name: 'Normal' }).getAttribute('aria-checked')).toBe('true');
  });

  it('is submitted by the footer button and shows both text rules when empty', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      submit();
    });
    expect(screen.getByText('Subject must be at least 2 characters.')).toBeTruthy();
    expect(screen.getByText('Description must be at least 5 characters.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands over the subject, the picked priority and the description', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'High' }));
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Broken build' } });
      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value: 'The schema check fails since this morning.' },
      });
      submit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      subject: 'Broken build',
      priority: SupportTicketPriority.High,
      description: 'The schema check fails since this morning.',
    });
  });
});
