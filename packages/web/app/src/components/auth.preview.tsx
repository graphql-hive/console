import { type ReactNode } from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { FaRegUserCircle } from 'react-icons/fa';
import { SiGithub, SiGoogle, SiOkta } from 'react-icons/si';
import { AuthCard, AuthCardStack, AuthOrSeparator } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const nav: NavPath = 'Components/Auth';

/**
 * Every AuthCard state in the app, one preview each.
 *
 * The seven auth pages cannot be imported directly: `auth-callback.tsx` and `auth-oidc.tsx` pull
 * in `@/env/frontend`, which validates an environment foundry does not have, and the form pages
 * mount supertokens. So each preview passes the page's real `title`/`description` and stubs the
 * form fields. `AuthCard`, `AuthCardStack` and `AuthOrSeparator` are the real components.
 *
 * Most of these states are unreachable by hand: OIDC and callback exist only mid-redirect, and
 * the error branches need a request to fail.
 */

/** The four provider buttons on sign-in and sign-up, in source order. */
function Providers(props: { verb: 'Login with' | 'Sign up with'; disabled?: boolean }) {
  return (
    <>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiGoogle className="mr-4 size-4" /> {props.verb} Google
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiGithub className="mr-4 size-4" /> {props.verb} Github
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <SiOkta className="mr-4 size-4" /> {props.verb} Okta
      </Button>
      <Button variant="outline" className="w-full" disabled={props.disabled}>
        <FaRegUserCircle className="mr-4 size-4" /> {props.verb} SSO
      </Button>
    </>
  );
}

/** Stands in for a Form/FormField pair, which would drag react-hook-form into every preview. */
function Field(props: {
  label: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label>{props.label}</Label>
        {props.children}
      </div>
      <Input placeholder={props.placeholder} type={props.type} disabled={props.disabled} readOnly />
    </div>
  );
}

// ---------------------------------------------------------------------------
// pages/auth-sign-in.tsx
// ---------------------------------------------------------------------------

function SignInForm(props: { submitLabel: string; disabled?: boolean; providers?: boolean }) {
  return (
    <AuthCardStack>
      <form className="grid gap-4">
        <Field label="Email" placeholder="m@example.com" type="email" disabled={props.disabled} />
        <Field label="Password" type="password" disabled={props.disabled}>
          <a href="#preview" className="ml-auto inline-block text-sm underline">
            Forgot your password?
          </a>
        </Field>
        <Button className="w-full" disabled={props.disabled}>
          {props.submitLabel}
        </Button>
      </form>
      {props.providers ? <AuthOrSeparator /> : null}
      {props.providers ? <Providers verb="Login with" disabled={props.disabled} /> : null}
    </AuthCardStack>
  );
}

export const SignIn = createPreview(() => (
  <AuthCard
    title="Login"
    description="Sign in to your account"
    content={<SignInForm submitLabel="Sign in" providers />}
  />
));

/** Mid-submit: every control disabled and the label swapped. No spinner anywhere. */
export const SignInSubmitting = createPreview({
  label: 'Sign in (submitting)',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Signing in..." disabled providers />}
    />
  ),
});

/** Succeeded, router navigating away. The last frame before the card unmounts. */
export const SignInRedirecting = createPreview({
  label: 'Sign in (redirecting)',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Redirecting..." disabled />}
    />
  ),
});

/** `enabledProviders.length` is 0, so the separator and provider buttons are dropped. */
export const SignInNoProviders = createPreview({
  label: 'Sign in (no OAuth providers)',
  render: () => (
    <AuthCard
      title="Login"
      description="Sign in to your account"
      content={<SignInForm submitLabel="Sign in" />}
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-sign-up.tsx
// ---------------------------------------------------------------------------

function SignUpForm(props: { submitLabel: string; disabled?: boolean; providers?: boolean }) {
  return (
    <AuthCardStack>
      <form className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" placeholder="Max" disabled={props.disabled} />
          <Field label="Last name" placeholder="Robinson" disabled={props.disabled} />
        </div>
        <Field label="Email" placeholder="m@example.com" type="email" disabled={props.disabled} />
        <Field label="Password" type="password" disabled={props.disabled} />
        <Button className="w-full" disabled={props.disabled}>
          {props.submitLabel}
        </Button>
      </form>
      {props.providers ? <AuthOrSeparator /> : null}
      {props.providers ? <Providers verb="Sign up with" disabled={props.disabled} /> : null}
    </AuthCardStack>
  );
}

export const SignUp = createPreview(() => (
  <AuthCard
    title="Register"
    description="Enter your information to create an account"
    content={<SignUpForm submitLabel="Create an account" providers />}
  />
));

export const SignUpSubmitting = createPreview({
  label: 'Sign up (submitting)',
  render: () => (
    <AuthCard
      title="Register"
      description="Enter your information to create an account"
      content={<SignUpForm submitLabel="Creating account..." disabled providers />}
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-sso.tsx
// ---------------------------------------------------------------------------

export const SSO = createPreview({
  label: 'SSO',
  render: () => (
    <AuthCard
      title="Login with SSO"
      description="Sign in to your account with an organization slug"
      content={
        <>
          <AuthCardStack>
            <form className="grid gap-4">
              <Field label="Organization slug" placeholder="acme">
                <CircleHelpIcon className="text-neutral-10 ml-2 size-4" />
              </Field>
              <Button className="w-full">Sign in</Button>
            </form>
          </AuthCardStack>
          <div className="mt-4 text-center text-sm">
            <a href="#preview" className="underline">
              Back to other sign-in options
            </a>
          </div>
        </>
      }
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-reset-password.tsx
// ---------------------------------------------------------------------------

export const ResetPassword = createPreview(() => (
  <AuthCard
    title="Reset your password"
    description="We will send you an email to reset your password"
    content={
      <form className="grid gap-4">
        <Field label="Email" placeholder="m@example.com" type="email" />
        <Button className="w-full">Email me</Button>
      </form>
    }
  />
));

/** Mid-request the label collapses to an ellipsis rather than a word. */
export const ResetPasswordSubmitting = createPreview({
  label: 'Reset password (submitting)',
  render: () => (
    <AuthCard
      title="Reset your password"
      description="We will send you an email to reset your password"
      content={
        <form className="grid gap-4">
          <Field label="Email" placeholder="m@example.com" type="email" disabled />
          <Button className="w-full" disabled>
            ...
          </Button>
        </form>
      }
    />
  ),
});

/** Post-submit. Title with no description, which is the header's other shape. */
export const ResetPasswordEmailSent = createPreview({
  label: 'Reset password (email sent)',
  render: () => (
    <AuthCard
      title="Email sent"
      content={
        <AuthCardStack>
          <p>
            A password reset email has been sent to{' '}
            <span className="font-semibold">m@example.com</span>, if it exists in our system.
          </p>
          <p className="text-neutral-10 text-sm">
            If you don't receive an email, try to{' '}
            <a href="#preview" className="underline">
              reset your password again
            </a>
            .
          </p>
        </AuthCardStack>
      }
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-verify-email.tsx
// ---------------------------------------------------------------------------

/** The default branch, with no `userIdentityId`. What most people see after signing up. */
export const VerifyEmailPrompt = createPreview({
  label: 'Verify email (prompt)',
  render: () => (
    <AuthCard
      title="Verify your email address"
      content={
        <AuthCardStack>
          <p>
            <span className="font-semibold">Please click on the link</span> in the email we just
            sent you to confirm your email address.
          </p>
          <Button className="w-full">Resend verification email</Button>
          <Button className="w-full" variant="outline">
            Logout
          </Button>
        </AuthCardStack>
      }
    />
  ),
});

/** `sendEmailMutation.fetching`, so only the resend button goes disabled. Logout stays live. */
export const VerifyEmailResending = createPreview({
  label: 'Verify email (resending)',
  render: () => (
    <AuthCard
      title="Verify your email address"
      content={
        <AuthCardStack>
          <p>
            <span className="font-semibold">Please click on the link</span> in the email we just
            sent you to confirm your email address.
          </p>
          <Button className="w-full" disabled>
            Resend verification email
          </Button>
          <Button className="w-full" variant="outline">
            Logout
          </Button>
        </AuthCardStack>
      }
    />
  ),
});

/** The only card in the app with a spinner in its content. */
export const VerifyEmailVerifying = createPreview({
  label: 'Verify email (verifying)',
  render: () => (
    <AuthCard
      title="Verifying your email address"
      description="This should only take a few seconds."
      content={
        <AuthCardStack>
          <div className="flex justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-t-[#3c3c3c]" />
          </div>
        </AuthCardStack>
      }
    />
  ),
});

export const VerifyEmailSuccess = createPreview({
  label: 'Verify email (success)',
  render: () => (
    <AuthCard
      title="Success!"
      description="Your email address has been successfully verified."
      content={
        <AuthCardStack>
          <Button className="w-full">Continue</Button>
        </AuthCardStack>
      }
    />
  ),
});

/** The `verifyEmail.error` branch, whose body is a server message rather than fixed copy. */
export const VerifyEmailRejected = createPreview({
  label: 'Verify email (rejected)',
  render: () => (
    <AuthCard
      title="Email verification"
      content={
        <AuthCardStack>
          <p>The verification link has expired.</p>
          <Button className="w-full">Continue</Button>
        </AuthCardStack>
      }
    />
  ),
});

export const VerifyEmailFailure = createPreview({
  label: 'Verify email (unexpected failure)',
  render: () => (
    <AuthCard
      title="Failed to verify your email"
      content={
        <AuthCardStack>
          <p>There was an unexpected error when verifying your email address.</p>
          <Button className="w-full">Resend verification email</Button>
          <Button className="w-full" variant="outline">
            Logout
          </Button>
        </AuthCardStack>
      }
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/auth-oidc.tsx and pages/auth-callback.tsx
// Mostly header-only cards, which is the shape with no content beneath the header.
// ---------------------------------------------------------------------------

export const OIDCRedirecting = createPreview({
  label: 'OIDC (redirecting)',
  render: () => (
    <AuthCard
      title="Starting OIDC Login Flow"
      description="You are being redirected to your OIDC provider."
    />
  ),
});

/** `description` is `auth.error.message`, so the text below stands in for a runtime value. */
export const OIDCFailed = createPreview({
  label: 'OIDC (failed)',
  render: () => (
    <AuthCard title="OIDC Login Flow Failed" description="Request failed with status code 400" />
  ),
});

/** Reached by opening /auth/oidc with no `id`. The only OIDC card with content. */
export const OIDCMissingId = createPreview({
  label: 'OIDC (missing ID)',
  render: () => (
    <AuthCard
      title="Missing ID"
      description="You need to provide an OIDC ID to sign in."
      content={
        <p className="text-neutral-10">
          <a href="#preview" className="underline">
            Learn how to login via OIDC
          </a>
        </p>
      }
    />
  ),
});

/** Titles come from `providerDetailsMap`, so they read as statements rather than instructions. */
export const CallbackRedirecting = createPreview({
  label: 'OAuth callback (redirecting)',
  render: () => (
    <AuthCard
      title="Continuing Google Authentication"
      description="Your are being redirected to Hive Console."
    />
  ),
});

/** `description` is the raw error off the failed request, so its length is unbounded. */
export const CallbackFailed = createPreview({
  label: 'OAuth callback (failed)',
  render: () => (
    <AuthCard
      title="Github Authentication Failed"
      description="Request failed with status code 401"
    />
  ),
});

/** The `NO_EMAIL_GIVEN_BY_PROVIDER` branch, the one description not taken from an error object. */
export const CallbackNoEmail = createPreview({
  label: 'OAuth callback (no email from provider)',
  render: () => (
    <AuthCard
      title="Okta Authentication Failed"
      description="No email address was provided by the auth provider. Please try again."
    />
  ),
});

/**
 * Controls now map to the props `AuthCard` actually takes. `content` is a slot rather than a
 * control, so the toggle only chooses between a stub body and none, which is the difference
 * between a form card and a redirect card.
 */
export const Playground = createPreview({
  controls: defineControls({
    title: { type: 'text', default: 'Login' },
    description: { type: 'text', default: 'Sign in to your account' },
    withDescription: { type: 'boolean', default: true },
    withContent: { type: 'boolean', default: true },
    withProviders: { type: 'boolean', default: false },
    submitting: { type: 'boolean', default: false },
  }),
  render: v => (
    <AuthCard
      title={v.title}
      description={v.withDescription ? v.description : undefined}
      content={
        v.withContent ? (
          <SignInForm
            submitLabel={v.submitting ? 'Signing in...' : 'Sign in'}
            disabled={v.submitting}
            providers={v.withProviders}
          />
        ) : undefined
      }
    />
  ),
});
