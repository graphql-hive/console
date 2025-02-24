import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { AuthCard, AuthCardContent, AuthCardHeader, AuthCardStack } from '@/components/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { useToast } from '@/components/ui/use-toast';
import { env } from '@/env/frontend';
import { authClient, AuthError } from '@/lib/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { captureException } from '@sentry/react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useRouter } from '@tanstack/react-router';

const ResetPasswordFormSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email address'),
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordFormSchema>;

function AuthResetPasswordEmail(props: {
  email: string | null;
  error: string | null;
  redirectToPath: string;
}) {
  const initialEmail = props.email ?? '';

  const resetEmail = useMutation({
    mutationFn(input: Parameters<typeof authClient.forgetPassword>[0]) {
      return authClient.forgetPassword(input);
    },
    onSuccess(res) {
      if (res.error) {
        throw new AuthError(res.error);
      }
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
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: {
      email: initialEmail ?? '',
    },
    disabled: resetEmail.isPending,
  });
  const { toast } = useToast();

  const onSubmit = useCallback(
    (data: ResetPasswordFormValues) => {
      const redirectUrl = new URL(env.appBaseUrl + '/auth/reset-password');
      if (props.redirectToPath) {
        redirectUrl.searchParams.set('redirectToPath', props.redirectToPath);
      }
      resetEmail.reset();
      resetEmail.mutate({
        email: data.email,
        redirectTo: redirectUrl.toString(),
      });
    },
    [resetEmail.mutate],
  );

  const session = authClient.useSession();

  if (session.isPending) {
    // AuthPage component already shows a loading state
    return null;
  }

  if (!!session.data) {
    // Redirect to the home page if the user is already signed in
    return <Navigate to={props.redirectToPath} />;
  }

  const isSent = resetEmail.isSuccess;

  if (isSent) {
    return (
      <AuthCard>
        <AuthCardHeader title="Email sent" />
        <AuthCardContent>
          <AuthCardStack>
            <p>
              A password reset email has been sent to{' '}
              <span className="font-semibold">{form.getValues().email}</span>, if it exists in our
              system.
            </p>
            <p className="text-muted-foreground text-sm">
              If you don't receive an email, try to{' '}
              <Link href="#" className="underline" onClick={resetEmail.reset}>
                reset your password again
              </Link>
              .
            </p>
          </AuthCardStack>
        </AuthCardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardHeader
        title="Reset your password"
        description="We will send you an email to reset your password"
      />
      <AuthCardContent>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={resetEmail.isPending}>
              {resetEmail.isSuccess ? 'Redirecting...' : resetEmail.isPending ? '...' : 'Email me'}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          <Link
            to="/auth/sign-in"
            search={{
              redirectToPath: props.redirectToPath,
            }}
            data-auth-link="sign-up"
            className="underline"
          >
            Back to login
          </Link>
        </div>
      </AuthCardContent>
    </AuthCard>
  );
}

const NewPasswordFormSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type NewPasswordFormValues = z.infer<typeof NewPasswordFormSchema>;

function AuthPasswordNew(props: { token: string; redirectToPath: string }) {
  const router = useRouter();
  const changePassword = useMutation({
    mutationFn(input: { token: string; newPassword: string }) {
      return authClient.resetPassword({
        newPassword: input.newPassword,
        token: input.token,
      });
    },
    onSuccess(res) {
      if (res.error) {
        throw new AuthError(res.error);
      }

      void router.navigate({
        to: '/auth/sign-in',
        search: {
          redirectToPath: props.redirectToPath,
        },
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
  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewPasswordFormSchema),
    defaultValues: {
      newPassword: '',
    },
    disabled: changePassword.isPending,
  });
  const { toast } = useToast();

  const onSubmit = useCallback(
    (data: NewPasswordFormValues) => {
      console.log('onSubmit');
      changePassword.reset();
      changePassword.mutate({
        newPassword: data.newPassword,
        token: props.token,
      });
    },
    [changePassword.mutate],
  );

  const session = authClient.useSession();

  if (session.isPending) {
    // AuthPage component already shows a loading state
    return null;
  }

  const isSent = changePassword.isSuccess;

  if (isSent) {
    return <Navigate to="/auth/sign-in" search={{ redirectToPath: props.redirectToPath }} />;
  }

  return (
    <AuthCard>
      <AuthCardHeader title="Change your password" description="Enter your new password" />
      <AuthCardContent>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={changePassword.isPending}>
              {changePassword.isSuccess
                ? 'Redirecting...'
                : changePassword.isPending
                  ? '...'
                  : 'Change password'}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          <Link
            to="/auth/sign-in"
            search={{
              redirectToPath: props.redirectToPath,
            }}
            data-auth-link="sign-up"
            className="underline"
          >
            Back to login
          </Link>
        </div>
      </AuthCardContent>
    </AuthCard>
  );
}

export function AuthResetPasswordPage(props: {
  email: string | null;
  error: string | null;
  token: string | null;
  redirectToPath: string;
}) {
  return (
    <>
      <Meta title="Reset Password" />
      {props.token ? (
        <AuthPasswordNew redirectToPath={props.redirectToPath} token={props.token} />
      ) : (
        <AuthResetPasswordEmail
          email={props.email}
          redirectToPath={props.redirectToPath}
          error={props.error}
        />
      )}
    </>
  );
}
