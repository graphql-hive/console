import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Story, StoryDefault } from '@ladle/react';
import { Input } from '../input/input';
import { Button } from '../button/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';

export default {
  title: 'UI / Form',
} satisfies StoryDefault;

const DemoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  threshold: z.string().min(1, 'Value is required'),
});

export const Default: Story = () => {
  const form = useForm<z.infer<typeof DemoSchema>>({
    resolver: zodResolver(DemoSchema),
    defaultValues: { name: '', threshold: '' },
  });

  return (
    <div className="max-w-sm p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel label="Alert name" />
                <FormControl>
                  <Input placeholder="Some cool alert name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel label="Value" />
                <FormControl>
                  <Input type="number" placeholder="Enter a value" {...field} />
                </FormControl>
                <FormDescription description="The threshold value for this alert." />
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Save</Button>
        </form>
      </Form>
    </div>
  );
};

export const WithErrors: Story = () => {
  const form = useForm<z.infer<typeof DemoSchema>>({
    resolver: zodResolver(DemoSchema),
    defaultValues: { name: '', threshold: '' },
  });

  return (
    <div className="max-w-sm p-8">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(() => {})}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel label="Alert name" />
                <FormControl>
                  <Input placeholder="Some cool alert name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit to see errors</Button>
        </form>
      </Form>
    </div>
  );
};
