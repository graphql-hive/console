import { type ReactNode } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Select } from '@/components/base/floating/select/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { Heading } from '@/components/ui/heading';
import * as GraphQLSchema from '@/gql/graphql';
import { expirationPeriods } from './shared-helpers';

/** @soure packages/services/api/src/modules/organization/providers/organization-access-tokens.ts */
export const TitleInputModel = z
  .string()
  .trim()
  .regex(/^[ a-zA-Z0-9_-]+$/, 'Can only contain letters, numbers, " ", "_", and "-".')
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.');

/** @soure packages/services/api/src/modules/organization/providers/organization-access-tokens.ts */
export const DescriptionInputModel = z
  .string()
  .trim()
  .max(248, 'Maximum length is 248 characters.')
  .optional();

/** Shared by the organization, personal and project access-token sheets. */
export const AccessTokenFormSchema = z.object({
  title: TitleInputModel,
  description: DescriptionInputModel,
  permissions: z.array(z.string()).min(1, 'Please select at least one permission.'),
  expirationPeriod: z.enum([
    GraphQLSchema.TokenExpirationPeriod.Never,
    GraphQLSchema.TokenExpirationPeriod.OneMonth,
    GraphQLSchema.TokenExpirationPeriod.OneWeek,
    GraphQLSchema.TokenExpirationPeriod.OneYear,
    GraphQLSchema.TokenExpirationPeriod.SixMonths,
    GraphQLSchema.TokenExpirationPeriod.TwoWeeks,
  ]),
});

export type AccessTokenFormValues = z.infer<typeof AccessTokenFormSchema>;

/** The first step of the sheet: name, description and expiry. Rendered inside the sheet's Form. */
export function AccessTokenGeneralStep(props: { form: UseFormReturn<AccessTokenFormValues> }) {
  const { form } = props;
  return (
    <div className="flex max-w-sm flex-col gap-5">
      <Heading>General</Heading>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Name" tooltip="Name of the access token." />
            <FormControl>
              <Input type="text" placeholder="My access token" onSurface="raised" {...field} />
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
            <FormLabel label="Description" tooltip="Description of the access token." />
            <FormControl>
              <Textarea placeholder="Short description" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="expirationPeriod"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              label="Expiration"
              tooltip="Expire the token automatically after a period of time."
            />
            <FormControl>
              <Select
                options={expirationPeriods.map(c => ({
                  value: c.value,
                  label: c.name,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                width="full"
                onSurface="raised"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** The second step: the permission picker the sheet supplies, with the field's message under it. */
export function AccessTokenPermissionsStep(props: {
  form: UseFormReturn<AccessTokenFormValues>;
  children: ReactNode;
}) {
  return (
    <FormField
      control={props.form.control}
      name="permissions"
      render={() => (
        <FormItem>
          <Heading>Permissions</Heading>
          {props.children}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
