import { useEffect } from 'react';
import { z } from 'zod';
import { Editor } from '@/components/laboratory/editor';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from '@tanstack/react-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLaboratory } from './context';

const settingsFormSchema = z.object({
  fetch: z.object({
    credentials: z.enum(['include', 'omit', 'same-origin']),
    timeout: z.number().optional(),
    retry: z.number().optional(),
    useGETForQueries: z.boolean().optional(),
  }),
  subscriptions: z.object({
    protocol: z.enum(['SSE', 'GRAPHQL_SSE', 'WS', 'LEGACY_WS']),
  }),
  introspection: z.object({
    method: z.enum(['GET', 'POST']).optional(),
    schemaDescription: z.boolean().optional(),
    headers: z.string().optional(),
    includeActiveOperationHeaders: z.boolean().optional(),
  }),
});

export const Settings = () => {
  const { settings, setSettings } = useLaboratory();

  const form = useForm({
    defaultValues: settings,
    validators: {
      onSubmit: settingsFormSchema,
    },
  });

  useEffect(() => {
    form.store.subscribe(state => {
      setSettings(state.currentVal.values);
    });
  }, [setSettings]);

  return (
    <div className="bg-card size-full overflow-y-auto p-3">
      <form id="settings-form" className="mx-auto flex max-w-2xl flex-col gap-4">
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
              <form.Field name="fetch.timeout">
                {field => {
                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Timeout</FieldLabel>
                      <Input
                        type="number"
                        name={field.name}
                        value={field.state.value ?? ''}
                        onChange={e =>
                          field.handleChange(
                            e.target.value === '' ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="fetch.retry">
                {field => {
                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Retry</FieldLabel>
                      <Input
                        type="number"
                        name={field.name}
                        value={field.state.value ?? ''}
                        onChange={e =>
                          field.handleChange(
                            e.target.value === '' ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="fetch.useGETForQueries">
                {field => {
                  return (
                    <Field className="flex-row items-center">
                      <Switch
                        className="!w-8"
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                      />
                      <FieldLabel htmlFor={field.name}>Use GET for queries</FieldLabel>
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>
              Configure the subscriptions options for the laboratory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <form.Field name="subscriptions.protocol">
                {field => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Protocol</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.state.value}
                        onValueChange={value =>
                          field.handleChange(value as 'SSE' | 'GRAPHQL_SSE' | 'WS' | 'LEGACY_WS')
                        }
                      >
                        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSE">SSE</SelectItem>
                          <SelectItem value="GRAPHQL_SSE">GRAPHQL_SSE</SelectItem>
                          <SelectItem value="WS">WS</SelectItem>
                          <SelectItem value="LEGACY_WS">LEGACY_WS</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Introspection</CardTitle>
            <CardDescription>
              Configure the introspection options for the laboratory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <form.Field name="introspection.method">
                {field => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Method</FieldLabel>
                      <Select
                        name={field.name}
                        value={field.state.value}
                        onValueChange={value => field.handleChange(value as 'GET' | 'POST')}
                      >
                        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="introspection.schemaDescription">
                {field => {
                  return (
                    <Field className="flex-row items-center">
                      <Switch
                        className="!w-8"
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                      />
                      <FieldLabel htmlFor={field.name}>Schema description</FieldLabel>
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="introspection.headers">
                {field => {
                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Headers</FieldLabel>
                      <Editor
                        value={field.state.value ?? '{}'}
                        onChange={field.handleChange}
                        defaultLanguage="json"
                        theme="hive-laboratory"
                        className="bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 h-64 rounded rounded-md border focus-within:ring-[3px]"
                      />
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="introspection.includeActiveOperationHeaders">
                {field => {
                  return (
                    <Field className="flex-row items-start">
                      <Switch
                        className="mt-0.5 !w-8"
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                      />
                      <div>
                        <FieldLabel htmlFor={field.name}>
                          Include active operation headers
                        </FieldLabel>
                        <FieldDescription>
                          Active operation (tab) headers will be included in the introspection query
                        </FieldDescription>
                      </div>
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
