// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  MemberInvitationForm,
  MemberInvitationFormSchema,
  type InvitableRole,
  type MemberInvitationFormValues,
} from './invitation-form';

const viewer: InvitableRole = {
  id: 'role-viewer',
  name: 'Viewer',
  description: 'Read only',
  isLocked: true,
  canInvite: true,
};
const admin: InvitableRole = {
  id: 'role-admin',
  name: 'Admin',
  description: 'Everything',
  isLocked: true,
  canInvite: true,
};
const restricted: InvitableRole = {
  id: 'role-restricted',
  name: 'Restricted',
  description: 'Outranks the viewer',
  isLocked: false,
  canInvite: false,
};

function Harness(props: {
  onSubmit: (values: MemberInvitationFormValues) => void | Promise<void>;
  isPending?: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(MemberInvitationFormSchema),
    mode: 'onChange',
    defaultValues: { email: '', role: viewer.id },
    disabled: props.isPending,
  });
  return (
    <MemberInvitationForm
      form={form}
      onSubmit={props.onSubmit}
      roles={[viewer, admin, restricted]}
      defaultRole={viewer}
      resources={<div>resource picker</div>}
    />
  );
}

// The submit is enabled by the form's validity, which the resolver settles a tick after mount.
async function renderForm(props: Parameters<typeof Harness>[0]) {
  render(<Harness {...props} />);
  await act(async () => {});
}

const emailInput = () => document.querySelector('input[name="email"]') as HTMLInputElement;
const roleTrigger = () =>
  document.querySelector('button[data-cy="role-selector-trigger"]') as HTMLButtonElement;
const submitButton = () =>
  screen.getByRole('button', { name: 'Send invitation' }) as HTMLButtonElement;

describe('MemberInvitationForm', () => {
  it('keeps the e2e hooks, starts on the default role and holds the submit until the email is valid', async () => {
    await renderForm({ onSubmit: () => {} });
    expect(emailInput()).not.toBeNull();
    expect(roleTrigger().textContent).toContain('Viewer');
    expect(screen.getByText('resource picker')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(emailInput(), { target: { value: 'ada@' } });
    });
    expect(screen.getByText('Please enter valid email address')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);

    await act(async () => {
      fireEvent.change(emailInput(), { target: { value: 'ada@example.com' } });
    });
    expect(submitButton().disabled).toBe(false);
  });

  // Picking another role goes through the popup, which the e2e invite flow drives; jsdom opens it
  // but does not commit a click on an option.
  it('offers every role, greys out one that cannot invite, and hands over the email with the role', async () => {
    const onSubmit = vi.fn();
    await renderForm({ onSubmit });
    await act(async () => {
      fireEvent.click(roleTrigger());
    });
    expect(screen.getByRole('option', { name: /Admin/ }).getAttribute('aria-disabled')).not.toBe(
      'true',
    );
    expect(screen.getByRole('option', { name: /Restricted/ }).getAttribute('aria-disabled')).toBe(
      'true',
    );

    await act(async () => {
      fireEvent.change(emailInput(), { target: { value: 'ada@example.com' } });
    });
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'ada@example.com', role: viewer.id });
  });

  it('disables the email and the role while the invitation is sending', async () => {
    await renderForm({ onSubmit: () => {}, isPending: true });
    expect(emailInput().disabled).toBe(true);
    expect(roleTrigger().disabled).toBe(true);
  });
});
