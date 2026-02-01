import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Alert Dialog',
};

export const Default: Story = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button>Open Alert</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your account and remove your
          data from our servers.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Continue</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const DestructiveAction: Story = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delete Item</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete this item. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const LongDescription: Story = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button>View Terms</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Terms and Conditions</AlertDialogTitle>
        <AlertDialogDescription>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            <p>
              By clicking continue, you agree to our Terms of Service and Privacy Policy. Please
              read these documents carefully before proceeding.
            </p>
            <p>
              This is a longer description to demonstrate how the alert dialog handles scrollable
              content when there's a lot of text that needs to be displayed to the user.
            </p>
            <p>
              The content will become scrollable when it exceeds the maximum height, ensuring the
              dialog remains usable even with extensive information.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Decline</AlertDialogCancel>
        <AlertDialogAction>Accept</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const CustomActions: Story = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">Publish Changes</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Publish your changes?</AlertDialogTitle>
        <AlertDialogDescription>
          Your changes will be visible to all users immediately after publishing.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Save as Draft</AlertDialogCancel>
        <AlertDialogAction className="bg-orange-300 hover:bg-orange-500">
          Publish Now
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Alert Dialog Component</h2>
      <p className="text-neutral-11 mb-4">
        Click the buttons below to see the alert dialog in action
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Alert</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button>Open Default Alert</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove
                  your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-neutral-10 text-xs">
            Overlay: <code className="text-neutral-12">bg-neutral-1.01 backdrop-blur-sm</code>
            <br />
            Content background: <code className="text-neutral-12">bg-neutral-3</code>
            <br />
            Border: <code className="text-neutral-12">border (default border color)</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Destructive Action</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Item</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this item. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-neutral-10 text-xs">
            Action button can be customized with destructive colors
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Layout</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <ul className="text-neutral-11 space-y-1 text-sm">
              <li>
                <code className="text-neutral-12">AlertDialogHeader</code>: Title and description
              </li>
              <li>
                <code className="text-neutral-12">AlertDialogTitle</code>: Main heading
              </li>
              <li>
                <code className="text-neutral-12">AlertDialogDescription</code>: Detailed message
              </li>
              <li>
                <code className="text-neutral-12">AlertDialogFooter</code>: Action buttons
              </li>
              <li>
                <code className="text-neutral-12">AlertDialogCancel</code>: Cancel/dismiss button
              </li>
              <li>
                <code className="text-neutral-12">AlertDialogAction</code>: Confirm/proceed button
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Spacing</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-10 text-xs">
              Content padding: <code className="text-neutral-12">p-6</code>
              <br />
              Content gap: <code className="text-neutral-12">gap-4</code>
              <br />
              Header spacing: <code className="text-neutral-12">space-y-2</code>
              <br />
              Footer spacing: <code className="text-neutral-12">sm:space-x-2</code>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Animation</h2>
      <div className="space-y-2">
        <p className="text-neutral-11 text-sm">
          Alert dialogs feature smooth enter and exit animations:
        </p>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-10 text-xs">
            Overlay: <code className="text-neutral-12">fade-in-0 / fade-out-0</code>
            <br />
            Content:{' '}
            <code className="text-neutral-12">zoom-in-95 / zoom-out-95 + slide animations</code>
            <br />
            Duration: <code className="text-neutral-12">duration-200</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="flex flex-wrap gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Confirm Action</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm your action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to proceed with this action?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Sign Out</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to sign in again to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay signed in</AlertDialogCancel>
              <AlertDialogAction>Sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Remove User</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove user from team?</AlertDialogTitle>
              <AlertDialogDescription>
                This user will lose access to all team resources immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  </div>
);
