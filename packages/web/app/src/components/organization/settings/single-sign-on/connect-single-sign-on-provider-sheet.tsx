import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import * as Sheet from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation as useRQMutation } from '@tanstack/react-query';

type ConnectSingleSignOnProviderSheetProps = {
  onClose: () => void;
  initialValues: null | {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    clientId: string;
    clientSecretPreview: string;
    additionalScopes: string;
  };
  onSave: (args: {
    tokenEndpoint: string;
    userinfoEndpoint: string;
    authorizationEndpoint: string;
    clientId: string;
    clientSecret: null | string;
    additionalScopes: string;
  }) => Promise<
    | {
        type: 'success';
      }
    | {
        type: 'error';
        tokenEndpoint: string | null;
        userinfoEndpoint: string | null;
        authorizationEndpoint: string | null;
        clientId: string | null;
        clientSecret: string | null;
        additionalScopes: string | null;
      }
  >;
};

export function ConnectSingleSignOnProviderSheet(
  props: ConnectSingleSignOnProviderSheetProps,
): React.ReactNode {
  const [state, setState] = useState<'discovery' | 'manual'>('discovery');
  const form = useForm({
    resolver: zodResolver(OIDCMetadataSchema),
    defaultValues: {
      authorization_endpoint: props.initialValues?.authorizationEndpoint ?? '',
      token_endpoint: props.initialValues?.tokenEndpoint ?? '',
      userinfo_endpoint: props.initialValues?.userinfoEndpoint ?? '',
      clientId: props.initialValues?.clientId ?? '',
      clientSecret: '',
      additionalScopes: props.initialValues?.additionalScopes ?? '',
    },
    mode: 'onSubmit',
  });

  async function onSubmit() {
    const state = form.getValues();
    const result = await props.onSave({
      tokenEndpoint: state.token_endpoint,
      userinfoEndpoint: state.userinfo_endpoint,
      authorizationEndpoint: state.authorization_endpoint,
      clientId: state.clientId,
      clientSecret: props.initialValues?.clientSecretPreview
        ? state.clientSecret || null
        : state.clientSecret,
      additionalScopes: state.additionalScopes,
    });

    if (result.type === 'success') {
      props.onClose();
      return;
    }

    if (result.additionalScopes) {
      form.setError('additionalScopes', {
        message: result.additionalScopes,
      });
    }

    if (result.clientId) {
      form.setError('clientId', {
        message: result.clientId,
      });
    }
    if (result.clientSecret) {
      form.setError('clientSecret', {
        message: result.clientSecret,
      });
    }

    if (result.authorizationEndpoint) {
      form.setError('authorization_endpoint', {
        message: result.authorizationEndpoint,
      });
    }

    if (result.tokenEndpoint) {
      form.setError('token_endpoint', {
        message: result.tokenEndpoint,
      });
    }

    if (result.userinfoEndpoint) {
      form.setError('userinfo_endpoint', {
        message: result.userinfoEndpoint,
      });
    }
  }

  const formNode = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="authorization_endpoint"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Authorization Endpoint</FormLabel>
                <FormControl>
                  <Input
                    disabled={state === 'discovery'}
                    placeholder="https://my.okta.com/oauth2/v1/authorize"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="token_endpoint"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Token Endpoint</FormLabel>
                <FormControl>
                  <Input
                    disabled={state === 'discovery'}
                    placeholder="https://my.okta.com/oauth2/v1/token"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="userinfo_endpoint"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Userinfo Endpoint</FormLabel>
                <FormControl>
                  <Input
                    disabled={state === 'discovery'}
                    placeholder="https://my.okta.com/oauth2/v1/userinfo"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <Input placeholder="Client ID" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Client Secret</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      props.initialValues
                        ? `Value ending with ${props.initialValues?.clientSecretPreview}`
                        : 'Client Secret'
                    }
                    autoComplete="off"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="additionalScopes"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Additional Scopes</FormLabel>
                <FormControl>
                  <Input placeholder="Separated by spaces" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </form>
    </Form>
  );

  return (
    <Sheet.Sheet open onOpenChange={props.onClose}>
      <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <Sheet.SheetHeader>
          <Sheet.SheetTitle>Connect OpenID Connect Provider</Sheet.SheetTitle>
          <Sheet.SheetDescription>
            Connecting an OIDC provider to this organization allows users to automatically log in
            and be part of this organization.
          </Sheet.SheetDescription>
          <Sheet.SheetDescription>
            Use Okta, Auth0, Google Workspaces or any other OAuth2 Open ID Connect compatible
            provider.
          </Sheet.SheetDescription>
        </Sheet.SheetHeader>
        <Tabs value={state}>
          <TabsList variant="content" className="mt-1">
            <TabsTrigger variant="content" value="discovery" onClick={() => setState('discovery')}>
              Discovery Document
            </TabsTrigger>
            <TabsTrigger variant="content" value="manual" onClick={() => setState('manual')}>
              Manual
            </TabsTrigger>
          </TabsList>
          <TabsContent value="discovery" variant="content">
            <OIDCMetadataFetcher
              onEndpointChange={args => {
                form.setValue('authorization_endpoint', args.authorization, {
                  shouldValidate: true,
                });
                form.setValue('token_endpoint', args.token, {
                  shouldValidate: true,
                });
                form.setValue('userinfo_endpoint', args.userinfo, {
                  shouldValidate: true,
                });
              }}
            />
            {formNode}
          </TabsContent>
          <TabsContent value="manual" variant="content">
            {formNode}
          </TabsContent>
        </Tabs>
        <Sheet.SheetFooter className="mb-0 mt-auto">
          <Button variant="secondary" onClick={props.onClose}>
            Abort
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="primary">
            Save
          </Button>
        </Sheet.SheetFooter>
      </Sheet.SheetContent>
    </Sheet.Sheet>
  );
}

function OIDCMetadataFetcher(props: {
  onEndpointChange(endpoints: { token: string; userinfo: string; authorization: string }): void;
}) {
  const { toast } = useToast();

  const fetchMetadata = useRQMutation({
    mutationFn: fetchOIDCMetadata,
    onSuccess(data) {
      if (!data.ok) {
        toast({
          title: data.error.message,
          description: (
            <div>
              <p>Status: {data.error.details.status}</p>
              <p>Response: {data.error.details.body ?? data.error.details.statusText}</p>
            </div>
          ),
          variant: 'destructive',
        });
        return;
      }

      const metadataResult = OIDCMetadataSchema.safeParse(data.metadata);
      if (!metadataResult.success) {
        toast({
          title: 'Failed to parse OIDC metadata',
          description: (
            <>
              {[
                metadataResult.error.formErrors.fieldErrors.authorization_endpoint?.[0],
                metadataResult.error.formErrors.fieldErrors.token_endpoint?.[0],
                metadataResult.error.formErrors.fieldErrors.userinfo_endpoint?.[0],
              ]
                .filter(Boolean)
                .map((msg, i) => (
                  <p key={i}>{msg}</p>
                ))}
            </>
          ),
          variant: 'destructive',
        });
        return;
      }

      props.onEndpointChange({
        token: metadataResult.data.token_endpoint,
        userinfo: metadataResult.data.userinfo_endpoint,
        authorization: metadataResult.data.authorization_endpoint,
      });
    },
    onError(error) {
      console.error(error);
      toast({
        title: 'Failed to fetch OIDC metadata',
        description: 'Provide the endpoints manually or try again later',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: z.infer<typeof OIDCMetadataFormSchema>) {
    fetchMetadata.mutate(data.url);
  }

  const form = useForm({
    resolver: zodResolver(OIDCMetadataFormSchema),
    defaultValues: {
      url: '',
    },
    mode: 'onSubmit',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => {
            return (
              <FormItem>
                <div className="flex flex-row justify-center gap-x-4">
                  <FormControl>
                    <Input
                      disabled={fetchMetadata.isPending}
                      placeholder="https://my.okta.com/.well-known/openid-configuration"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <Button type="submit" className="w-48" disabled={fetchMetadata.isPending}>
                    {fetchMetadata.isPending ? 'Fetching...' : 'Fetch endpoints'}
                  </Button>
                </div>
                <FormDescription>
                  Provide the OIDC metadata URL to automatically fill in the fields below.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </form>
    </Form>
  );
}

const OIDCMetadataFormSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

async function fetchOIDCMetadata(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: {
        message: 'Failed to fetch metadata',
        details: {
          url,
          status: res.status,
          statusText: res.statusText,
          body: await res.text(),
        },
      },
    } as const;
  }

  return {
    ok: true,
    metadata: await res.json(),
  } as const;
}

const OIDCMetadataSchema = z.object({
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

function FormError({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-red-500">{children}</div>;
}
