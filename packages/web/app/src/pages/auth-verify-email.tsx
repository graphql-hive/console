import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardStack } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { useToast } from '@/components/ui/use-toast';
import { authClient, AuthError } from '@/lib/auth';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

async function verifyEmail(input: { token: string }) {
  const res = await authClient.verifyEmail({
    query: {
      token: input.token,
    },
  });

  if (res.error) {
    throw new AuthError(res.error);
  }

  return true;
}

function AuthVerifyEmail(props: { token?: string }) {
  const token = props.token;
  const enabled = typeof token === 'string' && token.length > 0;
  const { toast } = useToast();

  const sendVerificationEmailMutation = useMutation({
    async mutationFn(input: { email: string }) {
      return authClient.sendVerificationEmail({
        email: input.email,
      });
    },
    onSuccess(res) {
      if (res.error) {
        throw new AuthError(res.error);
      }

      toast({
        title: 'Verification email sent',
        description: 'Please check your email inbox.',
      });
    },
    onError(error) {
      if (!(error instanceof AuthError)) {
        console.error(error);
        captureException(error);
      }

      toast({
        title: 'An error occurred',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  const emailVerification = useQuery({
    queryFn: verifyEmail,
    onError(error) {
      if (!(error instanceof AuthError)) {
        console.error(error);
        captureException(error);
      }
    },
    enabled,
    queryKey: ['email-verification', token],
  });

  if (!enabled) {
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
              className="w-full"
              disabled={sendVerificationEmailMutation.isPending}
              onClick={() => sendVerificationEmailMutation.mutate()}
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

  if (emailVerification.isPending) {
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

  if (emailVerification.isError) {
    return (
      <AuthCard>
        <AuthCardHeader title="Failed to verify your email" />
        <AuthCardContent>
          <AuthCardStack>
            <p>There was an unexpected error when verifying your email address.</p>
            <Button
              className="w-full"
              disabled={sendVerificationEmailMutation.isPending}
              onClick={() =>
                sendVerificationEmailMutation.mutate({
                  email: emailVerification.data?.email,
                })
              }
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

  if (emailVerification.isSuccess && emailVerification.data.status === 'OK') {
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

  if (
    emailVerification.isSuccess &&
    emailVerification.data.status === 'EMAIL_VERIFICATION_INVALID_TOKEN_ERROR'
  ) {
    return (
      <AuthCard>
        <AuthCardHeader title="Email verification" />
        <AuthCardContent>
          <AuthCardStack>
            <p>The email verification link has expired.</p>
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
      <AuthCardHeader title="Verify your email address" />
      <AuthCardContent>
        <AuthCardStack>
          <p>
            <span className="font-semibold">Please click on the link</span> in the email we just
            sent you to confirm your email address.
          </p>
          <Button
            className="w-full"
            disabled={sendVerificationEmailMutation.isPending}
            onClick={() => sendVerificationEmailMutation.mutate()}
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

export function AuthVerifyEmailPage(props: { token?: string }) {
  return (
    <>
      <Meta title="Email verification" />
      <AuthVerifyEmail token={props.token} />
    </>
  );
}
