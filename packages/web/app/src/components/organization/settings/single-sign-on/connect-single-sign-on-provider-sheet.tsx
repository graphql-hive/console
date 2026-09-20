import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { Tabs } from '@/components/base/tabs/tabs';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation as useRQMutation } from '@tanstack/react-query';
import {
  ConnectProviderForm,
  ConnectProviderFormSchema,
  OIDCMetadataSchema,
  OIDCMetadataUrlForm,
  OIDCMetadataUrlFormSchema,
  type OIDCMetadataUrlFormValues,
} from './connect-provider-form';

type ConnectSingleSignOnProviderSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Fires once the close transition has finished; the parent remounts the sheet on it. */
  onOpenChangeComplete: (open: boolean) => void;
  initialValues: null | {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint: string;
    clientId: string;
    clientSecretPreview: string;
    additionalScopes: string;
    userIdClaim: string;
  };
  onSave: (args: {
    tokenEndpoint: string;
    userinfoEndpoint: string;
    authorizationEndpoint: string;
    clientId: string;
    clientSecret: null | string;
    userIdClaim: null | string;
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
    resolver: zodResolver(ConnectProviderFormSchema),
    defaultValues: {
      authorization_endpoint: props.initialValues?.authorizationEndpoint ?? '',
      token_endpoint: props.initialValues?.tokenEndpoint ?? '',
      userinfo_endpoint: props.initialValues?.userinfoEndpoint ?? '',
      clientId: props.initialValues?.clientId ?? '',
      clientSecret: '',
      additionalScopes: props.initialValues?.additionalScopes ?? '',
      userIdClaim: props.initialValues?.userIdClaim ?? '',
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
      userIdClaim: state.userIdClaim.trim() || null,
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
    <ConnectProviderForm
      form={form}
      onSubmit={onSubmit}
      endpointsEditable={state === 'manual'}
      clientSecretPreview={props.initialValues?.clientSecretPreview}
    />
  );

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onClose}
      onOpenChangeComplete={props.onOpenChangeComplete}
      title="Connect OpenID Connect Provider"
      description={
        <>
          Connecting an OIDC provider to this organization allows users to automatically log in and
          be part of this organization.
          <br />
          Use Okta, Auth0, Google Workspaces or any other OAuth2 Open ID Connect compatible
          provider.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={props.onClose}>
            Abort
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            variant="primary"
            type="submit"
            data-button-oidc-save
          >
            Save
          </Button>
        </>
      }
    >
      <Tabs
        value={state}
        onValueChange={value => setState(value === 'manual' ? 'manual' : 'discovery')}
        items={[
          {
            value: 'discovery',
            label: 'Discovery Document',
            attrs: { 'data-button-oidc-discovery': '' },
            content: (
              <div className="space-y-2">
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
              </div>
            ),
          },
          {
            value: 'manual',
            label: 'Manual',
            attrs: { 'data-button-oidc-manual': '' },
            content: formNode,
          },
        ]}
      />
    </Sheet>
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

  function onSubmit(data: OIDCMetadataUrlFormValues) {
    fetchMetadata.mutate(data.url);
  }

  const form = useForm({
    resolver: zodResolver(OIDCMetadataUrlFormSchema),
    defaultValues: {
      url: '',
    },
    mode: 'onSubmit',
  });

  return (
    <OIDCMetadataUrlForm form={form} onSubmit={onSubmit} isPending={fetchMetadata.isPending} />
  );
}

async function fetchOIDCMetadata(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
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
