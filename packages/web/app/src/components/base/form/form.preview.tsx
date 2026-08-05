import { useEffect } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../button/button';
import { Input } from '../input/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';

export const nav: NavPath = 'Base/FormControls/Form';

const AlertFormSchema = z.object({
  name: z.string().min(3, 'Alert name must be at least 3 characters.'),
  threshold: z.string().regex(/^\d+$/, 'Threshold must be a whole number.'),
});

type AlertFormValues = z.infer<typeof AlertFormSchema>;

function AlertForm({ defaultValues }: { defaultValues: AlertFormValues }) {
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(AlertFormSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form className="flex w-80 flex-col gap-5" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Alert name" />
              <FormControl>
                <Input placeholder="P99 latency spike" {...field} />
              </FormControl>
              <FormDescription description="Shown in the notification channel." />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Threshold (ms)" />
              <FormControl>
                <Input placeholder="500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button variant="primary" type="submit">
          Save alert
        </Button>
      </form>
    </Form>
  );
}

/** Submit with an invalid value to see FormMessage appear. */
export const Default = createPreview(() => (
  <AlertForm defaultValues={{ name: 'P99 latency spike', threshold: '500' }} />
));

function InvalidAlertForm() {
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(AlertFormSchema),
    defaultValues: { name: 'ab', threshold: 'not-a-number' },
  });

  // Validate on mount so the error state is visible without interacting.
  useEffect(() => {
    void form.trigger();
  }, [form]);

  return (
    <Form {...form}>
      <form className="flex w-80 flex-col gap-5" onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Alert name" />
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription description="Shown in the notification channel." />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Threshold (ms)" />
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export const WithErrors = createPreview(() => <InvalidAlertForm />);
