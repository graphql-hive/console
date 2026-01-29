import type { Story } from '@ladle/react';
import { DottedBackground } from '@/components/ui/dotted-background';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HiveLogo } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';

export const Basic: Story = () => (
  <div className="h-[400px]">
    <DottedBackground>
      <div className="text-neutral-12 text-2xl font-bold">Welcome to GraphQL Hive</div>
    </DottedBackground>
  </div>
);

Basic.meta = {
  description: 'Basic dotted background with centered content',
};

export const WithCard: Story = () => (
  <div className="h-[500px]">
    <DottedBackground>
      <Card className="w-full max-w-md z-10">
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
          <CardDescription>Set up your new GraphQL Hive organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-neutral-12 text-sm font-medium">Organization Name</label>
              <Input placeholder="my-organization" />
            </div>
            <Button className="w-full">Create Organization</Button>
          </div>
        </CardContent>
      </Card>
    </DottedBackground>
  </div>
);

WithCard.meta = {
  description: 'Common pattern with Card centered on dotted background',
};

export const FullPageLayout: Story = () => (
  <div className="h-[600px]">
    <DottedBackground className="min-h-full">
      <div className="flex h-full grow items-center">
        <Button variant="outline" className="absolute right-6 top-6">
          Sign out
        </Button>
        <div className="absolute left-6 top-6">
          <HiveLogo className="size-10" />
        </div>
        <Card className="w-full max-w-md z-10">
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>Choose a name and slug for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-neutral-12 text-sm font-medium">Name</label>
                <Input placeholder="My Organization" />
              </div>
              <div className="space-y-2">
                <label className="text-neutral-12 text-sm font-medium">Slug</label>
                <Input placeholder="my-organization" />
              </div>
              <Button className="w-full">Create</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DottedBackground>
  </div>
);

FullPageLayout.meta = {
  description:
    'Full page layout pattern used in organization-new.tsx with logo, sign out, and centered form',
};

export const JoinOrganizationLayout: Story = () => (
  <div className="h-[600px]">
    <DottedBackground className="min-h-full">
      <div className="flex h-full grow items-center justify-center">
        <div className="absolute left-6 top-6">
          <HiveLogo className="size-10" />
        </div>
        <Card className="w-full max-w-md z-10">
          <CardHeader>
            <CardTitle>Join Organization</CardTitle>
            <CardDescription>
              You've been invited to join an organization on GraphQL Hive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-neutral-2 rounded-lg">
                <div className="text-neutral-11 text-sm mb-1">Organization</div>
                <div className="text-neutral-12 font-semibold">Acme Corporation</div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Accept Invitation</Button>
                <Button variant="outline" className="flex-1">
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DottedBackground>
  </div>
);

JoinOrganizationLayout.meta = {
  description: 'Join organization layout pattern based on organization-join.tsx',
};

export const TransferLayout: Story = () => (
  <div className="h-[600px]">
    <DottedBackground className="min-h-full">
      <div className="flex h-full grow items-center">
        <div className="absolute left-6 top-6">
          <HiveLogo className="size-10" />
        </div>
        <Card className="w-full max-w-md z-10">
          <CardHeader>
            <CardTitle>Transfer Organization</CardTitle>
            <CardDescription>
              Transfer ownership of this organization to another user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-neutral-12 text-sm font-medium">New Owner Email</label>
                <Input type="email" placeholder="user@example.com" />
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded">
                <p className="text-orange-500 text-xs">
                  Warning: This action cannot be undone. You will lose admin access to this
                  organization.
                </p>
              </div>
              <Button className="w-full" variant="destructive">
                Transfer Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DottedBackground>
  </div>
);

TransferLayout.meta = {
  description: 'Transfer organization layout pattern based on organization-transfer.tsx',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">DottedBackground Component</h2>
      <p className="text-neutral-11 mb-4">
        Decorative background component with a dotted pattern and radial gradient mask. Used for
        onboarding and authentication pages to create visual interest while keeping content
        focused.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Visual Effect</p>
          <div className="h-[300px] rounded-lg overflow-hidden">
            <DottedBackground>
              <div className="z-10 bg-neutral-1/90 rounded-lg p-6">
                <div className="text-neutral-12 text-lg font-semibold mb-2">
                  Content on dotted background
                </div>
                <p className="text-neutral-11 text-sm">
                  The radial gradient mask creates a spotlight effect, drawing attention to the
                  center content.
                </p>
              </div>
            </DottedBackground>
          </div>
          <p className="text-xs text-neutral-10">
            Base: <code className="text-neutral-12">bg-neutral-1</code>
            <br />
            Pattern: <code className="text-neutral-12">bg-dot-white/[0.2]</code> (dotted pattern
            at 20% opacity)
            <br />
            Mask:{' '}
            <code className="text-neutral-12">
              radial-gradient(ellipse_at_center, transparent_20%, black)
            </code>
            <br />
            Layout: <code className="text-neutral-12">
              flex size-full items-center justify-center
            </code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Centered Card</p>
          <div className="h-[350px] rounded-lg overflow-hidden">
            <DottedBackground>
              <Card className="w-full max-w-sm z-10">
                <CardHeader>
                  <CardTitle>Example Form</CardTitle>
                  <CardDescription>Content is elevated above the background</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input placeholder="Enter text..." />
                </CardContent>
              </Card>
            </DottedBackground>
          </div>
          <p className="text-xs text-neutral-10">
            Content needs <code className="text-neutral-12">z-10</code> or higher to appear above
            the mask layer
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Full Page Layout</p>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <DottedBackground className="min-h-full">
              <div className="flex h-full w-full items-center justify-center relative">
                <div className="absolute left-4 top-4 z-10">
                  <HiveLogo className="size-8" />
                </div>
                <div className="absolute right-4 top-4 z-10">
                  <Button size="sm" variant="outline">
                    Sign out
                  </Button>
                </div>
                <Card className="w-full max-w-sm z-10">
                  <CardHeader>
                    <CardTitle>Page Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-11 text-sm">
                      Logo and buttons positioned absolutely
                    </p>
                  </CardContent>
                </Card>
              </div>
            </DottedBackground>
          </div>
          <p className="text-xs text-neutral-10">
            Common pattern: absolute positioned elements for logo/navigation with centered main
            content
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">children</code>: React.ReactNode - Content to
            display on the background
          </li>
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional
            CSS classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            Outer container:{' '}
            <code className="text-neutral-12">
              bg-dot-white/[0.2] bg-neutral-1 relative flex size-full items-center
              justify-center
            </code>
          </li>
          <li>
            Mask layer (absolute):{' '}
            <code className="text-neutral-12">
              bg-neutral-1 pointer-events-none absolute inset-0
            </code>
          </li>
          <li>
            Mask gradient:{' '}
            <code className="text-neutral-12">
              [mask-image:radial-gradient(ellipse_at_center, transparent_20%, black)]
            </code>
          </li>
          <li>Children render on top of both layers</li>
          <li>
            Content should have <code className="text-neutral-12">z-10</code> or higher to appear
            above mask
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Patterns</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Onboarding Pages</p>
          <p className="text-neutral-10 text-xs">
            Create organization page (organization-new.tsx) with logo, sign out button, and
            centered form card.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Invitation Pages</p>
          <p className="text-neutral-10 text-xs">
            Join organization page (organization-join.tsx) showing invitation details with
            accept/decline actions.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Transfer Pages</p>
          <p className="text-neutral-10 text-xs">
            Organization transfer page (organization-transfer.tsx) with warning message and
            destructive action.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Authentication Flows</p>
          <p className="text-neutral-10 text-xs">
            Any full-page forms where you want to focus user attention on a single card/form
            without side navigation.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Visual Details</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            Dotted pattern: <code className="text-neutral-12">bg-dot-white/[0.2]</code> (Tailwind
            custom utility)
          </li>
          <li>
            Background color: <code className="text-neutral-12">bg-neutral-1</code>
          </li>
          <li>
            Radial mask: Creates ellipse at center, fading from transparent (20%) to black (edges)
          </li>
          <li>Effect: Spotlight/vignette drawing attention to center content</li>
          <li>
            Mask layer is <code className="text-neutral-12">pointer-events-none</code> so it
            doesn't block interactions
          </li>
          <li>
            Container uses <code className="text-neutral-12">size-full</code> (width and height
            100%)
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Layout Pattern</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <pre className="text-xs text-neutral-10 overflow-x-auto">
          {`<DottedBackground className="min-h-[100vh]">
  <div className="flex h-full grow items-center">
    <Button className="absolute right-6 top-6" />
    <Logo className="absolute left-6 top-6" />
    <Card className="w-full max-w-md z-10">
      {/* Form content */}
    </Card>
  </div>
</DottedBackground>`}
        </pre>
      </div>
    </div>
  </div>
);
