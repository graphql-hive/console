// @vitest-environment jsdom
import { ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Input } from '../input/input';
import { RadioGroup } from '../radio-group/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';

const Schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  plan: z.string(),
});

function NameForm(props: {
  onSubmit?: (values: z.infer<typeof Schema>) => void;
  tooltip?: React.ReactNode;
  icon?: typeof ShieldAlert;
}) {
  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', plan: 'hobby' },
  });
  return (
    <Form
      form={form}
      onSubmit={values => props.onSubmit?.(values)}
      attrs={{ 'data-cy': 'name-form' }}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Name" tooltip={props.tooltip} icon={props.icon} />
            <FormControl>
              <Input placeholder="Ada" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="plan"
        render={({ field }) => (
          <FormItem group>
            <FormLabel label="Plan" />
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              items={[
                { value: 'hobby', label: 'Hobby' },
                { value: 'pro', label: 'Pro' },
              ]}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <button type="submit">Save</button>
    </Form>
  );
}

describe('Form', () => {
  it('labels the field it wraps and reserves the message line', () => {
    render(<NameForm />);
    // One element: the provider and the form are the same component, and attrs land on the form.
    expect(document.querySelector('form[data-cy="name-form"]')).not.toBeNull();
    const input = screen.getByLabelText('Name');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    // The line is there before any error, so the form does not jump when one appears.
    const messages = document.querySelectorAll('[data-form-message]');
    expect(messages).toHaveLength(2);
    expect(messages[0].textContent).toBe('');
  });

  it('shows the error under the field, marks it invalid and describes it by the message', async () => {
    const onSubmit = vi.fn();
    render(<NameForm onSubmit={onSubmit} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    const input = screen.getByLabelText('Name');
    const message = screen.getByText('Name must be at least 3 characters.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(message.id);
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Ada Lovelace' } });
      fireEvent.click(screen.getByText('Save'));
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada Lovelace', plan: 'hobby' });
    expect(screen.queryByText('Name must be at least 3 characters.')).toBeNull();
  });

  it('puts a tooltip beside the label with the info icon by default, or the icon given', () => {
    const { rerender } = render(<NameForm tooltip="Shown in the channel." />);
    const row = () => screen.getByText('Name').closest('[data-label]')!;
    expect(row().querySelector('svg.lucide-info')).not.toBeNull();
    // A button cannot sit inside a label, so the trigger is the label's sibling.
    expect(screen.getByText('Name').querySelector('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'About Name' })).toBeTruthy();

    rerender(<NameForm tooltip="Shown in the channel." icon={ShieldAlert} />);
    expect(row().querySelector('svg.lucide-shield-alert')).not.toBeNull();
    expect(row().querySelector('svg.lucide-info')).toBeNull();

    rerender(<NameForm />);
    expect(screen.getByText('Name').closest('[data-label]')).toBeNull();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('renders a group item as a fieldset with the label as its legend', () => {
    render(<NameForm />);
    const group = screen.getByRole('group', { name: 'Plan' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.querySelector('legend')!.textContent).toBe('Plan');
  });
});
