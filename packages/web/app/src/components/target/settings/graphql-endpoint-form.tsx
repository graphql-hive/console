import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/primitives/button/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/primitives/form/form';
import { Input } from '@/components/ui/primitives/input/input';
import { graphqlEndpointFormStyles } from './graphql-endpoint-form.css';

export const GraphqlEndpointFormSchema = z.object({
  graphqlEndpointUrl: z
    .string()
    .min(1, 'Please enter a valid url.')
    .url('Please enter a valid url.')
    .max(300, 'Max 300 chars.'),
});

export type GraphqlEndpointFormValues = z.infer<typeof GraphqlEndpointFormSchema>;

/** The endpoint field and its Save, under the section header. The page owns the mutation. */
export function GraphqlEndpointForm(props: {
  form: UseFormReturn<GraphqlEndpointFormValues>;
  onSubmit: (values: GraphqlEndpointFormValues) => void | Promise<void>;
  /** The last save's failure, under the field. */
  error?: string;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="graphqlEndpointUrl"
        render={({ field }) => (
          <FormItem>
            <div className={graphqlEndpointFormStyles.fieldRow}>
              <FormControl>
                <Input
                  placeholder="Endpoint Url"
                  aria-label="GraphQL endpoint URL"
                  width="md"
                  {...field}
                />
              </FormControl>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.error ? <div className={graphqlEndpointFormStyles.error}>{props.error}</div> : null}
    </Form>
  );
}
