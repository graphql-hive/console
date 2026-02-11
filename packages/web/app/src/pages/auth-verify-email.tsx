import { useCallback, useEffect, useState } from 'react';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import { useMutation } from 'urql';
import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardStack } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { authVerifyEmailRoute } from '@/router';
import { Link, useNavigate } from '@tanstack/react-router';

const SendVerificationEmailMutation = graphql(`
  mutation SendVerificationEmailMutation($input: SendVerificationEmailInput!) {
    sendVerificationEmail(input: $input) {
      ok {
        expiresAt
      }
      error {
        message
        emailAlreadyVerified
      }
    }
  }
`);

const VerifyEmailMutation = graphql(`
  mutation VerifyEmailMutation($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      ok {
        verified
      }
      error {
        message
      }
    }
  }
`);

function AuthVerifyEmail() {
  const search = authVerifyEmailRoute.useSearch();
  const { toast } = useToast();
  const session = useSessionContext();
  const navigate = useNavigate();

  const [, sendEmailImpl] = useMutation(SendVerificationEmailMutation);
  const [verifyMutation, verify] = useMutation(VerifyEmailMutation);
  const [resendDisabled, setResendDisabled] = useState(true);

  const sendEmail = useCallback(
    async (resend?: boolean) => {
      if (session.loading) return;
      setResendDisabled(true);

      const result = await sendEmailImpl(
        {
          input: {
            userIdentityId: session.userId,
            resend,
          },
        },
        {
          fetchOptions: {
            headers: {
              'ignore-session': 'true',
            },
          },
        },
      );
      if (result.data?.sendVerificationEmail.ok) {
        toast({
          title: 'Verification email sent',
          description: 'Please check your email inbox.',
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else if (result.data?.sendVerificationEmail.error?.emailAlreadyVerified) {
        void navigate({ to: '/' });
      } else {
        toast({
          title: 'Failed to send verification email',
          description:
            result.data?.sendVerificationEmail.error?.message ??
            result.error?.message ??
            'An unknown error occurred.',
        });
      }

      setResendDisabled(false);
    },
    [session.loading, sendEmailImpl, toast],
  );

  useEffect(() => {
    if (session.loading) return;

    if (search.userIdentityId) {
      void verify(
        {
          input: {
            userIdentityId: search.userIdentityId,
            email: search.email,
            token: search.token,
          },
        },
        {
          fetchOptions: {
            headers: {
              'ignore-session': 'true',
            },
          },
        },
      );
    } else {
      void sendEmail();
    }
  }, [session.loading, search.userIdentityId, verify, sendEmail]);

  if (search.userIdentityId) {
    if (verifyMutation.error) {
      return (
        <AuthCard>
          <AuthCardHeader title="Failed to verify your email" />
          <AuthCardContent>
            <AuthCardStack>
              <p>There was an unexpected error when verifying your email address.</p>
              <Button className="w-full" disabled={resendDisabled} onClick={() => sendEmail(true)}>
                Resend verification email
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link to="/logout">Logout</Link>
              </Button>
            </AuthCardStack>
          </AuthCardContent>
        </AuthCard>
      );
    }

    if (verifyMutation.data?.verifyEmail.ok?.verified) {
      return (
        <AuthCard>
          <AuthCardHeader
            title="Success!"
            description="Your email address has been successfully verified."
          />
          <AuthCardContent>
            <AuthCardStack>
              <Button className="w-full" asChild>
                <Link to="/">Continue</Link>
              </Button>
            </AuthCardStack>
          </AuthCardContent>
        </AuthCard>
      );
    }

    if (verifyMutation.data?.verifyEmail.error) {
      return (
        <AuthCard>
          <AuthCardHeader title="Email verification" />
          <AuthCardContent>
            <AuthCardStack>
              <p>{verifyMutation.data?.verifyEmail.error.message}</p>
              <Button asChild className="w-full">
                <Link to="/auth" search={{ redirectToPath: '/' }}>
                  Continue
                </Link>
              </Button>
            </AuthCardStack>
          </AuthCardContent>
        </AuthCard>
      );
    }

    return (
      <AuthCard>
        <AuthCardHeader
          title="Verifying your email address"
          description="This should only take a few seconds."
        />
        <AuthCardContent>
          <AuthCardStack>
            <div className="flex justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-t-[#3c3c3c]" />
            </div>
          </AuthCardStack>
        </AuthCardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardHeader title="Verify your email address" />
      <AuthCardContent>
        <AuthCardStack>
          <p>
            <span className="font-semibold">Please click on the link</span> in the email we just
            sent you to confirm your email address.
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={resendDisabled}
            onClick={() => sendEmail(true)}
          >
            Resend verification email
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link to="/logout">Logout</Link>
          </Button>
        </AuthCardStack>
      </AuthCardContent>
    </AuthCard>
  );
}

export function AuthVerifyEmailPage() {
  return (
    <>
      <Meta title="Email verification" />
      <AuthVerifyEmail />
    </>
  );
}
