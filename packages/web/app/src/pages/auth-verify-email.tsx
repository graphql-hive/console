import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardStack } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { useToast } from '@/components/ui/use-toast';
import { authClient } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

function AuthVerifyEmail() {
  const session = authClient.useSession();
  const { toast } = useToast();

  const sendVerificationEmailMutation = useMutation({
    mutationFn: (email: string) => authClient.sendVerificationEmail({ email }),
    onSuccess({ data, error }) {
      if (data?.status) {
        toast({
          title: 'Verification email sent',
          description: 'Please check your email inbox.',
        });
      } else {
        toast({
          title: 'Failed to send verification email',
          description: error?.message ?? 'An unexpected error occurred.',
        });
      }
    },
  });

  if (!session.data) return;
  const user = session.data.user;

  if (sendVerificationEmailMutation.error) {
    return (
      <AuthCard>
        <AuthCardHeader title="Failed to verify your email" />
        <AuthCardContent>
          <AuthCardStack>
            <p>There was an unexpected error when verifying your email address.</p>
            <Button
              className="w-full"
              disabled={sendVerificationEmailMutation.isPending}
              onClick={() => sendVerificationEmailMutation.mutate(user.email)}
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

  if (sendVerificationEmailMutation.status !== 'idle') {
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

  if (user.emailVerified) {
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
            onClick={() => sendVerificationEmailMutation.mutate(user.email)}
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
