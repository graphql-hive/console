import { FaRegUserCircle } from 'react-icons/fa';
import { SiGithub, SiGoogle, SiOkta } from 'react-icons/si';
import {
  AuthCard,
  AuthCardContent,
  AuthCardHeader,
  AuthCardStack,
  AuthOrSeparator,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import type { Story } from '@ladle/react';

export default {
  title: 'Auth',
};

export const LoginForm: Story = () => (
  <div className="bg-neutral-1 flex min-h-[600px] items-center justify-center p-8">
    <AuthCard>
      <AuthCardHeader title="Login" description="Sign in to your account" />
      <AuthCardContent>
        <AuthCardStack>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
          <AuthOrSeparator />
          <Button variant="outline" className="w-full">
            <SiGoogle className="mr-4 size-4" /> Login with Google
          </Button>
          <Button variant="outline" className="w-full">
            <SiGithub className="mr-4 size-4" /> Login with Github
          </Button>
          <Button variant="outline" className="w-full">
            <FaRegUserCircle className="mr-4 size-4" /> Login with SSO
          </Button>
        </AuthCardStack>

        <div className="mt-4">
          <Text arrangement="block" align="center" size="small">
            Don't have an account?{' '}
            <a href="#" className="underline">
              Sign up
            </a>
          </Text>
        </div>
      </AuthCardContent>
    </AuthCard>
  </div>
);

LoginForm.meta = {
  description: 'Complete login form with email/password and SSO options',
};

export const SignUpForm: Story = () => (
  <div className="bg-neutral-1 flex min-h-[700px] items-center justify-center p-8">
    <AuthCard>
      <AuthCardHeader title="Register" description="Enter your information to create an account" />
      <AuthCardContent>
        <AuthCardStack>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" placeholder="Max" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" placeholder="Robinson" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
          </div>
          <AuthOrSeparator />
          <Button variant="outline" className="w-full">
            <SiGoogle className="mr-4 size-4" /> Sign up with Google
          </Button>
          <Button variant="outline" className="w-full">
            <SiGithub className="mr-4 size-4" /> Sign up with Github
          </Button>
        </AuthCardStack>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <a href="#" className="underline">
            Sign in
          </a>
        </div>
      </AuthCardContent>
    </AuthCard>
  </div>
);

SignUpForm.meta = {
  description: 'Complete signup form with name, email, password, and SSO options',
};

export const WithSSOButtons: Story = () => (
  <div className="bg-neutral-1 flex min-h-[600px] items-center justify-center p-8">
    <AuthCard>
      <AuthCardHeader title="Login" description="Sign in to your account" />
      <AuthCardContent>
        <AuthCardStack>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
          <AuthOrSeparator />
          <Button variant="outline" className="w-full">
            <SiGoogle className="mr-4 size-4" /> Login with Google
          </Button>
          <Button variant="outline" className="w-full">
            <SiGithub className="mr-4 size-4" /> Login with Github
          </Button>
          <Button variant="outline" className="w-full">
            <SiOkta className="mr-4 size-4" /> Login with Okta
          </Button>
        </AuthCardStack>
      </AuthCardContent>
    </AuthCard>
  </div>
);

WithSSOButtons.meta = {
  description: 'Form with GitHub, Google, and Okta SSO buttons',
};

export const EmailPasswordOnly: Story = () => (
  <div className="bg-neutral-1 flex min-h-[500px] items-center justify-center p-8">
    <AuthCard>
      <AuthCardHeader title="Login" description="Sign in to your account" />
      <AuthCardContent>
        <AuthCardStack>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
        </AuthCardStack>
        <div className="mt-8">
          <Text align="center" size="small" color="secondary">
            Don't have an account?{' '}
            <a href="_blank" className="underline">
              Sign up
            </a>
          </Text>
        </div>
      </AuthCardContent>
    </AuthCard>
  </div>
);

EmailPasswordOnly.meta = {
  description: 'Email/password form without SSO options',
};

export const OrSeparator: Story = () => (
  <div className="bg-neutral-1 p-8">
    <div className="mx-auto max-w-md space-y-4">
      <p className="text-neutral-11 text-sm">
        The "or" separator divides email/password authentication from SSO options:
      </p>
      <AuthOrSeparator />
      <p className="text-neutral-10 text-xs">
        Used between primary auth method and alternative sign-in options.
      </p>
    </div>
  </div>
);

OrSeparator.meta = {
  description: 'Standalone "or" separator component',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-5xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Auth Components</h2>
      <p className="text-neutral-11 mb-4">
        Authentication card components for login and signup forms. Built using Card primitives with
        consistent styling for auth flows.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">AuthCard</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="border-neutral-6 bg-neutral-1 mx-auto w-full rounded-lg border p-4 md:max-w-md">
              <div className="text-neutral-12 text-sm">
                Card wrapper (max-width: 28rem on desktop)
              </div>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Wrapper: <code className="text-neutral-12">mx-auto w-full md:max-w-md</code>
            <br />
            Extends Card component with centered layout
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">AuthCardHeader</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="space-y-1.5">
              <h3 className="text-neutral-12 text-2xl font-semibold">Login</h3>
              <p className="text-neutral-10 text-sm">Sign in to your account</p>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Title: <code className="text-neutral-12">text-2xl</code> (CardTitle)
            <br />
            Description: <code className="text-neutral-12">text-sm text-neutral-10</code>{' '}
            (CardDescription)
            <br />
            Optional description prop
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">AuthCardStack</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="grid gap-y-4">
              <div className="bg-neutral-3 text-neutral-11 rounded-sm p-3 text-sm">Item 1</div>
              <div className="bg-neutral-3 text-neutral-11 rounded-sm p-3 text-sm">Item 2</div>
              <div className="bg-neutral-3 text-neutral-11 rounded-sm p-3 text-sm">Item 3</div>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Layout: <code className="text-neutral-12">grid gap-y-4</code>
            <br />
            Stacks children vertically with consistent spacing
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">AuthOrSeparator</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <AuthOrSeparator />
          </div>
          <p className="text-neutral-10 text-xs">
            Container: <code className="text-neutral-12">flex items-center gap-x-4</code>
            <br />
            Lines: <code className="text-neutral-12">h-[1px] w-full bg-neutral-2</code>
            <br />
            Text: <code className="text-neutral-12">text-neutral-10</code>
            <br />
            Note: Uses gray-* instead of neutral-* scale
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Complete Login Form Structure</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <ul className="text-neutral-10 space-y-1 text-xs">
              <li>
                1. <strong className="text-neutral-12">AuthCard:</strong> Centered card wrapper
              </li>
              <li>
                2. <strong className="text-neutral-12">AuthCardHeader:</strong> Title and
                description
              </li>
              <li>
                3. <strong className="text-neutral-12">AuthCardContent:</strong> Card content
                wrapper
              </li>
              <li>
                4. <strong className="text-neutral-12">AuthCardStack:</strong> Stacked layout
              </li>
              <li>
                5. <strong className="text-neutral-12">Form fields:</strong> Email and password
                inputs
              </li>
              <li>
                6. <strong className="text-neutral-12">Submit button:</strong> Full width primary
                button
              </li>
              <li>
                7. <strong className="text-neutral-12">AuthOrSeparator:</strong> Divider
              </li>
              <li>
                8. <strong className="text-neutral-12">SSO buttons:</strong> Outline variant buttons
                with icons
              </li>
              <li>
                9. <strong className="text-neutral-12">Footer link:</strong> Sign up / Sign in link
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">SSO Button Pattern</p>
          <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
            <Button variant="outline" className="w-full">
              <SiGoogle className="mr-4 size-4" /> Login with Google
            </Button>
            <Button variant="outline" className="w-full">
              <SiGithub className="mr-4 size-4" /> Login with Github
            </Button>
            <Button variant="outline" className="w-full">
              <SiOkta className="mr-4 size-4" /> Login with Okta
            </Button>
            <p className="text-neutral-10 pt-2 text-xs">
              Variant: <code className="text-neutral-12">outline</code>
              <br />
              Width: <code className="text-neutral-12">w-full</code>
              <br />
              Icons: <code className="text-neutral-12">mr-4 size-4</code> (from simple-icons)
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Component Props</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">AuthCardHeader</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">title</code>: React.ReactNode - Header title
            </li>
            <li>
              <code className="text-neutral-12">description?</code>: React.ReactNode - Optional
              description
            </li>
            <li>
              <code className="text-neutral-12">className?</code>: string - Optional CSS classes
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">AuthCardStack</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode - Stacked elements
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">AuthCard</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode - Card content
            </li>
            <li>
              <code className="text-neutral-12">className?</code>: string - Optional CSS classes
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">AuthOrSeparator</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>No props - Pure presentational component</li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">AuthCardContent</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              Re-export of <code className="text-neutral-12">CardContent</code> from UI components
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Patterns</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Sign In Page</p>
          <p className="text-neutral-10 text-xs">
            Uses email + password fields, "Forgot password?" link, and optional SSO buttons
            separated by AuthOrSeparator. Footer link to sign up page.
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Sign Up Page</p>
          <p className="text-neutral-10 text-xs">
            Uses first name + last name (2-column grid), email, password fields, and optional SSO
            buttons. Footer link to sign in page.
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">SSO Integration</p>
          <p className="text-neutral-10 text-xs">
            Conditionally rendered based on enabled providers (Google, GitHub, Okta, OIDC). Uses
            simple-icons for provider logos. All buttons are full width with outline variant.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Color Usage Notes</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">AuthOrSeparator inconsistency:</strong> Uses{' '}
            <code className="text-neutral-12">bg-neutral-2</code> for lines and{' '}
            <code className="text-neutral-12">text-neutral-10</code> for text, not neutral-* scale
          </li>
          <li>
            <strong className="text-neutral-12">Form inputs:</strong> Inherit neutral colors from
            Input component
          </li>
          <li>
            <strong className="text-neutral-12">Card background:</strong> Uses neutral-1 from Card
            component
          </li>
          <li>
            <strong className="text-neutral-12">Typography:</strong> Title uses neutral-12,
            description uses neutral-10
          </li>
        </ul>
      </div>
    </div>
  </div>
);

ColorPaletteShowcase.meta = {
  description: 'Complete documentation of auth component colors and structure',
};
