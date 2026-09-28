import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Card } from '@/components/base/card/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { Spinner } from '@/components/ui/spinner';

export const CreateOrganizationFormSchema = z.object({
  slug: z
    .string({
      required_error: 'Organization slug is required',
    })
    .min(1, 'Organization slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes'),
});

export type CreateOrganizationFormValues = z.infer<typeof CreateOrganizationFormSchema>;

/**
 * The card on the new-organization page. The page owns the form state and the mutation, so this
 * can be exercised on its own.
 */
export function CreateOrganizationForm(props: {
  form: UseFormReturn<CreateOrganizationFormValues>;
  onSubmit: (values: CreateOrganizationFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <div className="container w-4/5 max-w-[520px] md:w-3/5">
      <Form form={form} onSubmit={props.onSubmit}>
        <Card
          variants={{ onSurface: 'raised', titleSize: 'large' }}
          title="Create an organization"
          description={
            <>
              An organization is built on top of <b>Projects</b>. You will become an <b>admin</b>{' '}
              and don't worry, you can add members later.
            </>
          }
        >
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="my-organization" onSurface="raised" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mt-6 flex items-center">
            <Button
              type="submit"
              width="full"
              onSurface="raised"
              disabled={!form.formState.isValid}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Spinner className="text-fg-inverse size-6" />
                  <span className="ml-4">Creating...</span>
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>
        </Card>
      </Form>
    </div>
  );
}
