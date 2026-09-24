// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RoleFields, RoleForm, RoleFormSchema, type RoleFormValues } from './role-form';

function Harness(props: { onSubmit: (values: RoleFormValues) => void | Promise<void> }) {
  const form = useForm({
    resolver: zodResolver(RoleFormSchema),
    mode: 'onChange',
    defaultValues: { name: '', description: '', selectedPermissions: ['schema:publish'] },
  });
  return (
    <RoleForm form={form} onSubmit={props.onSubmit} footer={<button type="submit">Save</button>}>
      <RoleFields form={form} permissions={<div>permission picker</div>} />
    </RoleForm>
  );
}

const nameInput = () => screen.getByLabelText('Name') as HTMLInputElement;
const descriptionInput = () => screen.getByLabelText('Description') as HTMLTextAreaElement;

async function type(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
  });
}

describe('RoleForm', () => {
  it('labels the fields and puts the picker in a group named Permissions', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(nameInput().tagName).toBe('INPUT');
    expect(descriptionInput().tagName).toBe('TEXTAREA');
    const group = screen.getByRole('group', { name: 'Permissions' });
    expect(group.contains(screen.getByText('permission picker'))).toBe(true);
  });

  it('applies the name rules as you type', async () => {
    render(<Harness onSubmit={() => {}} />);
    await type(nameInput(), 'A');
    expect(screen.getByText('Too short')).toBeTruthy();
    await type(nameInput(), 'release manager');
    expect(screen.getByText('Must start with a capital letter')).toBeTruthy();
    await type(nameInput(), 'Admin');
    expect(screen.getByText('Viewer and Admin are reserved')).toBeTruthy();
    await type(nameInput(), 'Release manager');
    expect(screen.queryByText('Viewer and Admin are reserved')).toBeNull();
  });

  it('refuses an empty description and hands over trimmed values with the permissions', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await type(nameInput(), 'Release manager');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(screen.getByText('Too short')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await type(descriptionInput(), '  Can publish schemas.  ');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Release manager',
      description: 'Can publish schemas.',
      selectedPermissions: ['schema:publish'],
    });
  });
});
