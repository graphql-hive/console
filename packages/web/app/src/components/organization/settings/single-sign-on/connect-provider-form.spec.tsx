// @vitest-environment jsdom
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  ConnectProviderForm,
  ConnectProviderFormSchema,
  OIDCMetadataUrlForm,
  OIDCMetadataUrlFormSchema,
  type ConnectProviderFormValues,
  type OIDCMetadataUrlFormValues,
} from './connect-provider-form';

const endpointNames = ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint'] as const;

function ProviderHarness(props: {
  onSubmit: (values: ConnectProviderFormValues) => void;
  endpointsEditable: boolean;
  clientSecretPreview?: string;
}) {
  const form = useForm({
    resolver: zodResolver(ConnectProviderFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      authorization_endpoint: '',
      token_endpoint: '',
      userinfo_endpoint: '',
      clientId: '',
      clientSecret: '',
      userIdClaim: '',
      additionalScopes: '',
    },
  });
  return (
    <>
      <ConnectProviderForm
        form={form}
        onSubmit={props.onSubmit}
        endpointsEditable={props.endpointsEditable}
        clientSecretPreview={props.clientSecretPreview}
      />
      <button type="button" onClick={form.handleSubmit(props.onSubmit)}>
        Save
      </button>
    </>
  );
}

const input = (name: string) =>
  document.querySelector(`form[data-form-oidc] input[name="${name}"]`) as HTMLInputElement;

describe('ConnectProviderForm', () => {
  it('keeps the e2e hooks and locks the endpoints until the manual tab', () => {
    const { rerender } = render(<ProviderHarness onSubmit={() => {}} endpointsEditable={false} />);
    for (const name of [...endpointNames, 'clientId', 'clientSecret']) {
      expect(input(name)).not.toBeNull();
    }
    for (const name of endpointNames) {
      expect(input(name).disabled).toBe(true);
    }
    expect(input('clientId').disabled).toBe(false);
    expect(input('clientSecret').placeholder).toBe('Client Secret');

    rerender(<ProviderHarness onSubmit={() => {}} endpointsEditable clientSecretPreview="a1b2" />);
    for (const name of endpointNames) {
      expect(input(name).disabled).toBe(false);
    }
    expect(input('clientSecret').placeholder).toBe('Value ending with a1b2');
  });

  it('labels every field', () => {
    render(<ProviderHarness onSubmit={() => {}} endpointsEditable />);
    for (const label of [
      'Authorization Endpoint',
      'Token Endpoint',
      'Userinfo Endpoint',
      'Client ID',
      'Client Secret',
      'User ID Claim',
      'Additional Scopes',
    ]) {
      expect(screen.getByLabelText(label).tagName).toBe('INPUT');
    }
  });

  it('checks only the endpoints on the client, then hands everything over', async () => {
    const onSubmit = vi.fn();
    render(<ProviderHarness onSubmit={onSubmit} endpointsEditable />);
    await act(async () => {
      fireEvent.change(input('token_endpoint'), { target: { value: 'not a url' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(screen.getByText('Token endpoint must be a valid URL')).toBeTruthy();
    expect(screen.getByText('Userinfo endpoint must be a valid URL')).toBeTruthy();
    expect(screen.getByText('Authorization endpoint must be a valid URL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    const values = {
      authorization_endpoint: 'https://idp.example.com/authorize',
      token_endpoint: 'https://idp.example.com/token',
      userinfo_endpoint: 'https://idp.example.com/userinfo',
      clientId: 'hive',
      clientSecret: 'shh',
      userIdClaim: '',
      additionalScopes: '',
    };
    await act(async () => {
      for (const [name, value] of Object.entries(values)) {
        if (value) {
          fireEvent.change(input(name), { target: { value } });
        }
      }
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual(values);
  });
});

function UrlHarness(props: {
  onSubmit: (values: OIDCMetadataUrlFormValues) => void;
  isPending?: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(OIDCMetadataUrlFormSchema),
    defaultValues: { url: '' },
    mode: 'onSubmit',
  });
  return (
    <OIDCMetadataUrlForm
      form={form}
      onSubmit={props.onSubmit}
      isPending={props.isPending ?? false}
    />
  );
}

describe('OIDCMetadataUrlForm', () => {
  it('rejects a bad URL, then hands a good one over', async () => {
    const onSubmit = vi.fn();
    render(<UrlHarness onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'About Metadata URL' })).toBeTruthy();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Metadata URL'), { target: { value: 'nope' } });
      fireEvent.click(screen.getByRole('button', { name: 'Fetch endpoints' }));
    });
    expect(screen.getByText('Must be a valid URL')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Metadata URL'), {
        target: { value: 'https://idp.example.com/.well-known/openid-configuration' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Fetch endpoints' }));
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      url: 'https://idp.example.com/.well-known/openid-configuration',
    });
  });

  it('locks the field and the button while fetching', () => {
    render(<UrlHarness onSubmit={() => {}} isPending />);
    expect((screen.getByLabelText('Metadata URL') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Fetching...' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
