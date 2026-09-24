import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Select } from '@/components/base/floating/select/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import type { DocumentCollectionOperation } from '@/lib/hooks/laboratory/use-collections';

export const OperationFormSchema = z.object({
  name: z
    .string({
      required_error: 'Operation name is required',
    })
    .min(3, {
      message: 'Operation name must be at least 3 characters long',
    })
    .max(50, {
      message: 'Operation name must be less than 50 characters long',
    }),
  collectionId: z.string({
    required_error: 'Collection is required',
  }),
});

export type OperationFormValues = z.infer<typeof OperationFormSchema>;

/**
 * The body of the create and edit operation dialogs. Creating also picks the collection; editing
 * only renames, so it passes no collections. The dialog owns the form state and submits from its
 * footer by the form's id.
 */
export function OperationForm(props: {
  form: UseFormReturn<OperationFormValues>;
  onSubmit: (values: OperationFormValues) => void | Promise<void>;
  id: string;
  collections?: readonly DocumentCollectionOperation[];
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: props.id }}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Operation Name" />
            <FormControl>
              <Input
                autoComplete="off"
                {...field}
                placeholder="Your Operation Name"
                onSurface="raised"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.collections ? (
        <FormField
          control={form.control}
          name="collectionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Which collection would you like to save this operation to?" />
              <FormControl>
                <Select
                  options={props.collections!.map(c => ({
                    value: c.id,
                    label: c.name,
                    description: c.description,
                    'data-cy': 'collection-select-item',
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select a Collection"
                  matchTriggerWidth
                  width="full"
                  onSurface="raised"
                  data-cy="collection-select-trigger"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </Form>
  );
}
