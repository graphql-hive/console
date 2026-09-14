// @vitest-environment jsdom
import { createRef } from 'react';
import { useFormik } from 'formik';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Input } from './input';

/** A field that react-hook-form's FormControl wraps, the way every Form in the app does. */
function ReactHookFormField(props: { onSubmit: (values: { name: string }) => void }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

/** A field wired by hand from Formik state, the way the Formik forms in the app do. */
function FormikField(props: { onSubmit: (values: { name: string }) => void }) {
  const formik = useFormik({
    initialValues: { name: '' },
    validate: values => (values.name ? {} : { name: 'Name is required' }),
    onSubmit: props.onSubmit,
  });
  return (
    <form onSubmit={formik.handleSubmit}>
      <Input
        name="name"
        placeholder="Name"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        invalid={formik.touched.name && !!formik.errors.name}
      />
      <button type="submit">Save</button>
    </form>
  );
}

describe('Input', () => {
  it('renders a native input with its attributes and forwards the ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} type="email" placeholder="Email" autoComplete="off" data-cy="email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(ref.current).toBe(input);
    expect(input).toHaveProperty('type', 'email');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('data-cy')).toBe('email');
    // Regression: the merge used to drop the colour next to the `text-control` size.
    expect(input.className).toContain('text-neutral-12');
    expect(input.className).toContain('text-control');
  });

  it('marks the field invalid through aria-invalid, and only then', () => {
    const { rerender } = render(<Input placeholder="Name" />);
    expect(screen.getByPlaceholderText('Name').getAttribute('aria-invalid')).toBeNull();
    rerender(<Input placeholder="Name" invalid />);
    expect(screen.getByPlaceholderText('Name').getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps its own classes under a FormControl', () => {
    // Regression: FormControl is a Radix Slot that merges a className into its child, an empty
    // one when the field is valid. Spread onto the input it wiped every class the component had.
    render(<ReactHookFormField onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText('Name');
    expect(input.className).toContain('rounded-sm');
    expect(input.className).toContain('border');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('reports a react-hook-form error and submits the typed value', async () => {
    const onSubmit = vi.fn();
    render(<ReactHookFormField onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Name is required')).toBeTruthy();
    const input = screen.getByPlaceholderText('Name');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(input, { target: { value: 'production' } });
    fireEvent.click(screen.getByText('Save'));
    // react-hook-form passes the submit event as the second argument.
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'production' }, expect.anything()),
    );
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('reports a Formik error and submits the typed value', async () => {
    const onSubmit = vi.fn();
    render(<FormikField onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Save'));
    const input = screen.getByPlaceholderText('Name');
    await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));

    fireEvent.change(input, { target: { value: 'production' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'production' }, expect.anything()),
    );
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('applies size, width and mono as classes', () => {
    render(<Input placeholder="Page" size="compact" width="xs" mono />);
    const input = screen.getByPlaceholderText('Page');
    expect(input.className).toContain('h-7.5');
    expect(input.className).toContain('w-16');
    expect(input.className).toContain('font-mono');
  });

  it('renders the prefix text, leading icon and trailing slot around the field', () => {
    render(
      <Input
        placeholder="slug"
        prefixText="app.graphql-hive.com/"
        leadingIcon={Search}
        trailing={<button type="button">Clear</button>}
        width="sm"
      />,
    );
    const input = screen.getByPlaceholderText('slug');
    expect(screen.getByText('app.graphql-hive.com/')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
    expect(input.className).toContain('rounded-l-none');
    expect(input.className).toContain('pl-9');
    expect(input.className).toContain('pr-9');
    // The width sits on the wrapper so the decorations stay inside it.
    expect(input.parentElement?.className).toContain('w-48');
    expect(input.className).toContain('w-full');
  });
});
