// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  ReplyTicketForm,
  ReplyTicketFormSchema,
  type ReplyTicketFormValues,
} from './reply-ticket-form';

function Harness(props: { onSubmit: (values: ReplyTicketFormValues) => void | Promise<void> }) {
  const form = useForm({
    resolver: zodResolver(ReplyTicketFormSchema),
    defaultValues: { body: '' },
  });
  return <ReplyTicketForm form={form} onSubmit={props.onSubmit} />;
}

const replyBox = () => screen.getByLabelText('Reply') as HTMLTextAreaElement;

describe('ReplyTicketForm', () => {
  it('holds an empty reply back, then hands over the comment', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    });
    expect(screen.getByText('Comment must be at least 2 characters.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(replyBox(), { target: { value: 'Thanks, that fixed it.' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ body: 'Thanks, that fixed it.' });
  });

  it('clears the box on Reset', async () => {
    render(<Harness onSubmit={() => {}} />);
    await act(async () => {
      fireEvent.change(replyBox(), { target: { value: 'Draft' } });
    });
    expect(replyBox().value).toBe('Draft');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    });
    expect(replyBox().value).toBe('');
  });
});
