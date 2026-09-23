import { type ReactNode } from 'react';
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
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { Textarea } from '@/components/base/textarea/textarea';

export const RoleFormSchema = z.object({
  name: z
    .string({
      required_error: 'Required',
    })
    .trim()
    .min(2, 'Too short')
    .max(64, 'Max 64 characters long')
    .refine(
      val => typeof val === 'string' && val.length > 0 && val[0] === val[0].toUpperCase(),
      'Must start with a capital letter',
    )
    .refine(val => val !== 'Viewer' && val !== 'Admin', 'Viewer and Admin are reserved'),
  description: z
    .string({
      required_error: 'Please enter role description',
    })
    .trim()
    .min(2, 'Too short')
    .max(256, 'Description is too long'),
  selectedPermissions: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof RoleFormSchema>;

/**
 * The member-role dialogs share this shell: the body, then a right-aligned button row. The
 * creator swaps the body for a permission overview on its confirm step, so the body is a child.
 */
export function RoleForm(props: {
  form: UseFormReturn<RoleFormValues>;
  onSubmit: (values: RoleFormValues) => void | Promise<void>;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Form form={props.form} onSubmit={props.onSubmit}>
      {props.children}
      <div className="flex items-center justify-end gap-2">{props.footer}</div>
    </Form>
  );
}

/** Name and description beside the permission column, whose picker the dialog supplies. */
export function RoleFields(props: { form: UseFormReturn<RoleFormValues>; permissions: ReactNode }) {
  const { form } = props;
  return (
    <div className="flex flex-row gap-6">
      <div className="flex w-72 shrink-0 flex-col gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel label="Name" />
              <FormControl>
                <Input
                  placeholder="Enter a name"
                  type="text"
                  autoComplete="off"
                  onSurface="raised"
                  {...field}
                />
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
              <FormLabel label="Description" />
              <FormControl>
                <Textarea
                  placeholder="Enter a description"
                  autoComplete="off"
                  onSurface="raised"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grow">
        <FormField
          control={form.control}
          name="selectedPermissions"
          render={() => (
            <FormItem group>
              <FormLabel label="Permissions" />
              <div className="flex h-[400px] flex-col">
                <ScrollArea fill>{props.permissions}</ScrollArea>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
