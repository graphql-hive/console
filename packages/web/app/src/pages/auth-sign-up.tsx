import { useCallback, useEffect } from 'react';
import { CircleUserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { sendVerificationEmail } from 'supertokens-auth-react/recipe/emailverification';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import { emailPasswordSignUp } from 'supertokens-auth-react/recipe/thirdpartyemailpassword';
import { AuthCard, AuthCardStack, AuthOrSeparator } from '@/components/auth';
import {
  SignUpForm,
  SignUpFormSchema,
  type SignUpFormValues,
} from '@/components/auth/sign-up-form';
import { Button } from '@/components/base/button/button';
import { useToast } from '@/components/base/toast/toast';
import { GitHubIcon, GoogleIcon, OktaIcon } from '@/components/ui/brand-icon';
import { Meta } from '@/components/ui/meta';
import { env } from '@/env/frontend';
import { useLastAuthMethod } from '@/lib/supertokens/last-auth-method';
import { startAuthFlowForProvider } from '@/lib/supertokens/start-auth-flow-for-provider';
import { enabledProviders, isProviderEnabled } from '@/lib/supertokens/thirdparty';
import { exhaustiveGuard } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useRouter } from '@tanstack/react-router';
import { SignInButton } from './auth-sign-in';

export function AuthSignUpPage(props: { redirectToPath: string }) {
  const [lastAuthMethod] = useLastAuthMethod();
  const router = useRouter();
  const session = useSessionContext();

  const sendVerificationEmailMutation = useMutation({
    mutationFn: () => sendVerificationEmail(),
    onSuccess() {
      void router.navigate({
        to: '/auth/verify-email',
      });
    },
    retry: 3,
    onError() {
      // In case of an error, we still want to redirect the user to the verify email page
      // so they can request a new verification email, if needed
      // and understand that the account was created.
      void router.navigate({
        to: '/auth/verify-email',
      });
    },
  });

  const signUp = useMutation({
    mutationFn: emailPasswordSignUp,
    onSuccess(data) {
      const status = data.status;

      switch (status) {
        case 'OK': {
          if (env.auth.requireEmailVerification) {
            sendVerificationEmailMutation.mutate();
          } else {
            void router.navigate({
              to: props.redirectToPath,
            });
          }
          break;
        }
        case 'FIELD_ERROR': {
          for (const field of data.formFields) {
            form.setError(field.id as keyof SignUpFormValues, {
              type: 'manual',
              message: field.error,
            });
          }
          break;
        }
        case 'SIGN_UP_NOT_ALLOWED': {
          toast({
            title: 'Sign up not allowed',
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
      toast({
        title: 'An error occurred',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const thirdPartySignIn = useMutation({
    async mutationFn(provider: 'github' | 'google' | 'okta') {
      await startAuthFlowForProvider(provider, props.redirectToPath);
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

  const isPending = signUp.isPending || thirdPartySignIn.isPending;

  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
    disabled: isPending,
  });

  useEffect(() => {
    form.setFocus('firstName', { shouldSelect: true });
  }, [signUp.isPending]);

  const { toast } = useToast();

  const onSubmit = useCallback(
    (data: SignUpFormValues) => {
      signUp.reset();
      signUp.mutate({
        formFields: [
          {
            id: 'email',
            value: data.email,
          },
          {
            id: 'password',
            value: data.password,
          },
          {
            id: 'firstName',
            value: data.firstName,
          },
          {
            id: 'lastName',
            value: data.lastName,
          },
        ],
      });
    },
    [signUp.mutate],
  );

  if (session.loading) {
    // AuthPage component already shows a loading state
    return null;
  }

  if (session.doesSessionExist) {
    // Redirect to the home page if the user is already signed in
    return <Navigate to="/" />;
  }

  const isVerificationSettled = env.auth.requireEmailVerification
    ? sendVerificationEmailMutation.isSuccess || sendVerificationEmailMutation.isError
    : true;

  return (
    <>
      <Meta title="Sign Up" />
      <AuthCard
        title="Register"
        description="Enter your information to create an account"
        content={
          <>
            <AuthCardStack>
              <>
                <SignUpForm
                  form={form}
                  onSubmit={onSubmit}
                  submit={
                    <Button type="submit" width="full" onSurface="raised" disabled={isPending}>
                      {signUp.isSuccess && signUp.data.status === 'OK' && isVerificationSettled
                        ? 'Redirecting...'
                        : signUp.isPending
                          ? 'Creating account...'
                          : 'Create an account'}
                    </Button>
                  }
                />
                {enabledProviders.length ? <AuthOrSeparator /> : null}
                {isProviderEnabled('google') ? (
                  <SignInButton previousSignIn={lastAuthMethod === 'google'} variant="outline">
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('google')}
                      disabled={isPending}
                    >
                      <GoogleIcon className="mr-4 size-4" /> Sign up with Google
                    </Button>
                  </SignInButton>
                ) : null}
                {isProviderEnabled('github') ? (
                  <SignInButton previousSignIn={lastAuthMethod === 'github'} variant="outline">
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('github')}
                      disabled={isPending}
                    >
                      <GitHubIcon className="mr-4 size-4" /> Sign up with Github
                    </Button>
                  </SignInButton>
                ) : null}
                {isProviderEnabled('okta') ? (
                  <SignInButton previousSignIn={lastAuthMethod === 'okta'} variant="outline">
                    <Button
                      variant="outline"
                      width="full"
                      onClick={() => thirdPartySignIn.mutate('okta')}
                      disabled={isPending}
                    >
                      <OktaIcon className="mr-4 size-4" /> Sign up with Okta
                    </Button>
                  </SignInButton>
                ) : null}
                {isProviderEnabled('oidc') ? (
                  <SignInButton previousSignIn={lastAuthMethod === 'oidc'} variant="outline">
                    <Button
                      variant="outline"
                      width="full"
                      render={
                        <Link to="/auth/sso" search={{ redirectToPath: props.redirectToPath }} />
                      }
                    >
                      <CircleUserRound className="mr-4 size-4" /> Sign up with SSO
                    </Button>
                  </SignInButton>
                ) : null}
              </>
            </AuthCardStack>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link
                to="/auth/sign-in"
                search={{ redirectToPath: props.redirectToPath }}
                data-auth-link="sign-in"
                className="underline"
              >
                Sign in
              </Link>
            </div>
          </>
        }
      />
    </>
  );
}
