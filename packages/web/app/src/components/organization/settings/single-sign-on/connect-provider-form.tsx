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
import { Button } from '@/components/base/button/button';

/** The endpoints a discovery document must carry, and the only client-side validated fields. */
export const OIDCMetadataSchema = z.object({
  token_endpoint: z
    .string({
      required_error: 'Token endpoint not found',
    })
    .url('Token endpoint must be a valid URL'),
  userinfo_endpoint: z
    .string({
      required_error: 'Userinfo endpoint not found',
    })
    .url('Userinfo endpoint must be a valid URL'),
  authorization_endpoint: z
    .string({
      required_error: 'Authorization endpoint not found',
    })
    .url('Authorization endpoint must be a valid URL'),
});

// The remaining fields are checked by the server on save and surfaced through form.setError.
export const ConnectProviderFormSchema = OIDCMetadataSchema.extend({
  clientId: z.string(),
  clientSecret: z.string(),
  userIdClaim: z.string(),
  additionalScopes: z.string(),
});

export type ConnectProviderFormValues = z.infer<typeof ConnectProviderFormSchema>;

/**
 * The provider fields of the connect sheet, shown under both its tabs. The sheet owns the form
 * state and saves from its footer.
 */
export function ConnectProviderForm(props: {
  form: UseFormReturn<ConnectProviderFormValues>;
  onSubmit: (values: ConnectProviderFormValues) => void | Promise<void>;
  /** The endpoints are typed in on the manual tab and filled from the document otherwise. */
  endpointsEditable: boolean;
  /** The tail of the stored secret when editing, so an empty field keeps it. */
  clientSecretPreview?: string | null;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ 'data-form-oidc': '' }}>
      <FormField
        control={form.control}
        name="authorization_endpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Authorization Endpoint" />
            <FormControl>
              <Input
                onSurface="raised"
                placeholder="https://my.okta.com/oauth2/v1/authorize"
                autoComplete="off"
                {...field}
                disabled={field.disabled || !props.endpointsEditable}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="token_endpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Token Endpoint" />
            <FormControl>
              <Input
                onSurface="raised"
                placeholder="https://my.okta.com/oauth2/v1/token"
                autoComplete="off"
                {...field}
                disabled={field.disabled || !props.endpointsEditable}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="userinfo_endpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Userinfo Endpoint" />
            <FormControl>
              <Input
                onSurface="raised"
                placeholder="https://my.okta.com/oauth2/v1/userinfo"
                autoComplete="off"
                {...field}
                disabled={field.disabled || !props.endpointsEditable}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="clientId"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Client ID" />
            <FormControl>
              <Input placeholder="Client ID" autoComplete="off" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="clientSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Client Secret" />
            <FormControl>
              <Input
                placeholder={
                  props.clientSecretPreview
                    ? `Value ending with ${props.clientSecretPreview}`
                    : 'Client Secret'
                }
                autoComplete="off"
                type="password"
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
        name="userIdClaim"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="User ID Claim" />
            <FormControl>
              <Input placeholder="sub" autoComplete="off" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="additionalScopes"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Additional Scopes" />
            <FormControl>
              <Input
                placeholder="Separated by spaces"
                autoComplete="off"
                onSurface="raised"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

export const OIDCMetadataUrlFormSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export type OIDCMetadataUrlFormValues = z.infer<typeof OIDCMetadataUrlFormSchema>;

/** The discovery-document URL and its fetch button, above the provider fields. */
export function OIDCMetadataUrlForm(props: {
  form: UseFormReturn<OIDCMetadataUrlFormValues>;
  onSubmit: (values: OIDCMetadataUrlFormValues) => void | Promise<void>;
  isPending: boolean;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              label="Metadata URL"
              tooltip="Provide the OIDC metadata URL to automatically fill in the fields below."
            />
            <div className="flex flex-row justify-center gap-x-4">
              <FormControl>
                <Input
                  onSurface="raised"
                  placeholder="https://my.okta.com/.well-known/openid-configuration"
                  autoComplete="off"
                  {...field}
                  disabled={field.disabled || props.isPending}
                />
              </FormControl>
              <Button type="submit" onSurface="raised" disabled={props.isPending}>
                {props.isPending ? 'Fetching...' : 'Fetch endpoints'}
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
