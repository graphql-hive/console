import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { Callout } from '@/components/ui/callout';

/** The dialog footer's submit button lives outside the form and targets it by this id. */
export const COLLECTION_FORM_ID = 'create-collection-form';

export const CollectionFormSchema = z.object({
  name: z
    .string({
      required_error: 'Collection name is required',
    })
    .min(2, {
      message: 'Collection name must be at least 2 characters long',
    })
    .max(50, {
      message: 'Collection name must be at most 50 characters long',
    }),
  description: z.string().optional(),
});

export type CollectionFormValues = z.infer<typeof CollectionFormSchema>;

/** The body of the create and update collection dialog. The dialog owns the form state. */
export function CollectionForm(props: {
  form: UseFormReturn<CollectionFormValues>;
  onSubmit: (values: CollectionFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: COLLECTION_FORM_ID }}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Collection Name" />
            <FormControl>
              <Input {...field} placeholder="My Collection" onSurface="raised" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Collection Description" />
            <FormControl>
              <Input {...field} placeholder="My Collection" onSurface="raised" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Callout type="info" className="mt-0">
        This collection will be available to everyone in the organization
      </Callout>
    </Form>
  );
}
