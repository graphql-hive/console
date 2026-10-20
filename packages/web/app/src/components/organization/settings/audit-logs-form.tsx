import { ArrowRightIcon } from 'lucide-react';
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
import * as styles from './audit-logs-form.css';

export const AuditLogsFormSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export type AuditLogsFormValues = z.infer<typeof AuditLogsFormSchema>;

/** The date range of the audit-log export dialog. The page owns the form state and the mutation. */
export function AuditLogsForm(props: {
  form: UseFormReturn<AuditLogsFormValues>;
  onSubmit: (values: AuditLogsFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <div className={styles.auditLogsFormDiv}>
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="date" aria-label="Start date" onSurface="raised" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className={styles.auditLogsFormDiv2}>
          <ArrowRightIcon className={styles.auditLogsFormArrowRightIcon} />
        </div>
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="date" aria-label="End date" onSurface="raised" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className={styles.auditLogsFormDiv3}>
        <Button
          width="full"
          type="submit"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          Generate Report
        </Button>
      </div>
    </Form>
  );
}
