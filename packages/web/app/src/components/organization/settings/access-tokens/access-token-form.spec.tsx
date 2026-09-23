// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { Form } from '@/components/base/form/form';
import { TokenExpirationPeriod } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  AccessTokenFormSchema,
  AccessTokenGeneralStep,
  AccessTokenPermissionsStep,
  type AccessTokenFormValues,
} from './access-token-form';

/** Both steps at once, with stand-ins for the sheet's picker and its footer buttons. */
function Harness(props: { onSubmit: (values: AccessTokenFormValues) => void }) {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(AccessTokenFormSchema),
    defaultValues: {
      title: '',
      description: '',
      permissions: [],
      expirationPeriod: TokenExpirationPeriod.Never,
    },
  });
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <AccessTokenGeneralStep form={form} />
      <AccessTokenPermissionsStep form={form}>
        <button
          type="button"
          onClick={() => form.setValue('permissions', ['schema:check'], { shouldValidate: true })}
        >
          grant
        </button>
      </AccessTokenPermissionsStep>
      <button type="button" onClick={() => void form.trigger('permissions')}>
        check permissions
      </button>
      <button type="submit">submit</button>
    </Form>
  );
}

const nameInput = () => screen.getByLabelText('Name') as HTMLInputElement;
const descriptionInput = () => screen.getByLabelText('Description') as HTMLTextAreaElement;

async function type(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
  });
}

describe('access token form', () => {
  it('labels the three fields, each with its explanation behind an icon', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(nameInput().tagName).toBe('INPUT');
    expect(descriptionInput().tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('Expiration').tagName).toBe('BUTTON');
    for (const name of ['Name', 'Description', 'Expiration']) {
      expect(screen.getByRole('button', { name: `About ${name}` })).toBeTruthy();
    }
  });

  it('applies the server-side name and description rules as you type', async () => {
    render(<Harness onSubmit={() => {}} />);
    await type(nameInput(), 'a');
    expect(screen.getByText('Minimum length is 2 characters.')).toBeTruthy();
    await type(nameInput(), 'my token!');
    expect(screen.getByText('Can only contain letters, numbers, " ", "_", and "-".')).toBeTruthy();
    await type(nameInput(), 'a'.repeat(101));
    expect(screen.getByText('Maximum length is 100 characters.')).toBeTruthy();
    await type(descriptionInput(), 'a'.repeat(249));
    expect(screen.getByText('Maximum length is 248 characters.')).toBeTruthy();
  });

  it('asks for at least one permission and clears the message once one is granted', async () => {
    render(<Harness onSubmit={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'check permissions' }));
    });
    expect(screen.getByText('Please select at least one permission.')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'grant' }));
    });
    expect(screen.queryByText('Please select at least one permission.')).toBeNull();
  });

  it('hands over the trimmed fields with the permissions and the expiry', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await type(nameInput(), ' CI token ');
    await type(descriptionInput(), 'Publishes from CI');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'grant' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: 'CI token',
      description: 'Publishes from CI',
      permissions: ['schema:check'],
      expirationPeriod: TokenExpirationPeriod.Never,
    });
  });
});
