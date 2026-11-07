import { useCallback, useEffect } from 'react';
import { CircleUserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AuthCard, AuthCardStack, AuthOrSeparator } from '@/components/auth';
import {
  SignInForm,
  SignInFormSchema,
  type SignInFormValues,
} from '@/components/auth/sign-in-form';
import { GitHubIcon, GoogleIcon, OktaIcon } from '@/components/ui/brand-icon';
import { Meta } from '@/components/ui/meta';
import { Button } from '@/components/ui/primitives/button/button';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { Text } from '@/components/ui/text';
import { signIn } from '@/lib/auth/api';
import { useLastAuthMethod } from '@/lib/auth/last-auth-method';
import { resolveOidcId } from '@/lib/auth/oidc-lookup';
import { enabledProviders, isProviderEnabled } from '@/lib/auth/providers';
import { startThirdPartyAuth } from '@/lib/auth/third-party';
import { useSession } from '@/lib/auth/use-session';
import { organizationSlugFromPath } from '@/lib/route-utils';
import { exhaustiveGuard } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, Navigate, useRouter } from '@tanstack/react-router';
import * as styles from './auth-sign-in.css';

export function SignInButton(props: {
  children: React.ReactElement;
  previousSignIn: boolean;
  variant?: 'outline' | 'default';
}) {
  if (props.previousSignIn) {
    return (
      <span className={styles.signInButtonSpan}>
        <Tooltip trigger={props.children} content="You signed in with it last time." side="top" />
        <span aria-hidden className={styles.signInButtonSpan2} />
      </span>
    );
  }

  return props.children;
}

export function AuthSignInPage(props: { redirectToPath: string }) {
  const session = useSession();
  const [lastAuthMethod, setLastAuthMethod] = useLastAuthMethod();
  const router = useRouter();
  const { toast } = useToast();

  const emailPasswordSignIn = useMutation({
    mutationFn: signIn,
    onSuccess(data) {
      const status = data.status;

      switch (status) {
        case 'OK': {
          setLastAuthMethod('email');
          void router.navigate({
            to: props.redirectToPath,
          });
          break;
        }
        case 'WRONG_CREDENTIALS_ERROR': {
          toast({
            title: 'Invalid email or password',
            description: 'Please check your email and password and try again.',
            variant: 'destructive',
          });
          break;
        }
        case 'SIGN_IN_NOT_ALLOWED': {
          toast({
            title: 'Sign in not allowed',
            description: 'Please contact support for assistance.',
            variant: 'destructive',
          });
          break;
        }
        default: {
          exhaustiveGuard(status);
        }
      }
    },
    onError(error) {
      console.error(error);
      toast({
        title: 'An error occurred',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const thirdPartySignIn = useMutation({
    async mutationFn(provider: 'github' | 'google' | 'okta') {
      await startThirdPartyAuth(provider, props.redirectToPath);
    },
    onError(error) {
      console.error(error);
      toast({
        title: 'An error occurred',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isPending = emailPasswordSignIn.isPending || thirdPartySignIn.isPending;

  const ssoSlug = organizationSlugFromPath(props.redirectToPath);
  const ssoLookup = useQuery({
    queryKey: ['oidc-lookup', ssoSlug],
    queryFn: () => resolveOidcId(ssoSlug!),
    enabled:
      !!ssoSlug && isProviderEnabled('oidc') && !session.loading && !session.doesSessionExist,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const ssoOrganization =
    ssoSlug && ssoLookup.data?.ok ? { slug: ssoSlug, id: ssoLookup.data.id } : undefined;

  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    disabled: isPending,
  });

  useEffect(() => {
    if (emailPasswordSignIn.isPending === false) {
      form.setFocus('email', { shouldSelect: true });
    }
  }, [emailPasswordSignIn.isPending]);

  const onSubmit = useCallback(
    (data: SignInFormValues) => {
      emailPasswordSignIn.reset();
      emailPasswordSignIn.mutate(data);
    },
    [emailPasswordSignIn.mutate],
  );

  if (session.loading) {
    // AuthPage component already shows a loading state
    return null;
  }

  if (session.doesSessionExist && emailPasswordSignIn.isIdle && thirdPartySignIn.isIdle) {
    // Already signed in on arrival. Once a sign-in started here, onSuccess owns the navigation
    // (the store flips before the request resolves, and the page is still mounted afterwards).
    return <Navigate to="/" />;
  }

  return (
    <>
      <Meta title="Sign in" />
      <AuthCard
        title="Login"
        description="Sign in to your account"
        content={
          <>
            <AuthCardStack>
              <>
                <SignInForm
                  form={form}
                  onSubmit={onSubmit}
                  forgotPasswordLink={email => (
                    <Link
                      tabIndex={-1}
                      to="/auth/reset-password"
                      search={{
                        email: email || undefined,
                        redirectToPath: props.redirectToPath,
                      }}
                      className={styles.authSignInPageLink}
                    >
                      Forgot your password?
                    </Link>
                  )}
                  submit={
                    <SignInButton previousSignIn={lastAuthMethod === 'email'}>
                      <Button type="submit" width="full" onSurface="raised" disabled={isPending}>
                        {emailPasswordSignIn.data?.status === 'OK'
                          ? 'Redirecting...'
                          : emailPasswordSignIn.isPending
                            ? 'Signing in...'
                            : 'Sign in'}
                      </Button>
                    </SignInButton>
                  }
                />
                {enabledProviders.length ? <AuthOrSeparator /> : null}
                {isProviderEnabled('google') ? (
                  <SignInButton variant="outline" previousSignIn={lastAuthMethod === 'google'}>
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('google')}
                      disabled={isPending}
                    >
                      <GoogleIcon className={styles.authSignInPageGoogleIcon} /> Login with Google
                    </Button>
                  </SignInButton>
                ) : null}
                {isProviderEnabled('github') ? (
                  <SignInButton variant="outline" previousSignIn={lastAuthMethod === 'github'}>
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('github')}
                      disabled={isPending}
                    >
                      <GitHubIcon className={styles.authSignInPageGitHubIcon} /> Login with Github
                    </Button>
                  </SignInButton>
                ) : null}

                {isProviderEnabled('okta') ? (
                  <SignInButton variant="outline" previousSignIn={lastAuthMethod === 'okta'}>
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('okta')}
                      disabled={isPending}
                    >
                      <OktaIcon className={styles.authSignInPageOktaIcon} /> Login with Okta
                    </Button>
                  </SignInButton>
                ) : null}
                {isProviderEnabled('oidc') ? (
                  <SignInButton variant="outline" previousSignIn={lastAuthMethod === 'oidc'}>
                    <Button
                      variant="outline"
                      width="full"
                      disabled={isPending}
                      render={
                        ssoOrganization ? (
                          <Link
                            to="/auth/oidc"
                            search={{
                              id: ssoOrganization.id,
                              slug: ssoOrganization.slug,
                              redirectToPath: props.redirectToPath,
                            }}
                          />
                        ) : (
                          <Link
                            to="/auth/sso"
                            search={{ redirectToPath: props.redirectToPath }}
                            preload={false}
                          />
                        )
                      }
                    >
                      <CircleUserRound className={styles.authSignInPageCircleUserRound} />
                      {ssoOrganization
                        ? `Login with SSO (${ssoOrganization.slug})`
                        : 'Login with SSO'}
                    </Button>
                  </SignInButton>
                ) : null}
              </>
            </AuthCardStack>
            <div className={styles.authSignInPageDiv}>
              <Text arrangement="block" align="center" size="small" color="secondary">
                Don't have an account?{' '}
                <Link
                  to="/auth/sign-up"
                  search={{
                    redirectToPath: props.redirectToPath,
                  }}
                  data-auth-link="sign-up"
                  className={styles.authSignInPageLink2}
                >
                  Sign up
                </Link>
              </Text>
            </div>
          </>
        }
      />
    </>
  );
}
