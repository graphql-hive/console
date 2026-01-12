import { z } from 'zod';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/laboratory/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/laboratory/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/laboratory/components/ui/select';
import { useForm } from '@tanstack/react-form';

const settingsFormSchema = z.object({
  fetch: z.object({
    credentials: z.enum(['include', 'omit', 'same-origin']),
  }),
});

export const Settings = () => {
  const { settings, setSettings } = useLaboratory();

  const form = useForm({
    defaultValues: settings,
    validators: {
      onSubmit: settingsFormSchema,
    },
    onSubmit: ({ value }) => {
      setSettings(value as typeof settings);
    },
  });

  return (
    <div className="bg-card size-full p-3">
      <form
        id="settings-form"
        onSubmit={form.handleSubmit}
        onChange={form.handleSubmit}
        className="mx-auto max-w-2xl"
      >
        <Card>
          <CardHeader>
            <CardTitle>Fetch</CardTitle>
            <CardDescription>Configure the fetch options for the laboratory.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <form.Field name="fetch.credentials">
                {field => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Credentials</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.state.value}
                        onValueChange={value =>
                          field.handleChange(value as 'include' | 'omit' | 'same-origin')
                        }
                      >
                        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                          <SelectValue placeholder="Select credentials" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="include">Include</SelectItem>
                          <SelectItem value="omit">Omit</SelectItem>
                          <SelectItem value="same-origin">Same-origin</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
