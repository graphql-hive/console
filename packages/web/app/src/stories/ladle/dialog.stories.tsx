import type { Story } from "@ladle/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Simple: Story = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dialog Title</DialogTitle>
        <DialogDescription>
          This is a simple dialog with a title and description.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <p className="text-neutral-11 text-sm">Dialog content goes here.</p>
      </div>
    </DialogContent>
  </Dialog>
);

export const WithForm: Story = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="primary">Create Project</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogDescription>
          Enter a name and description for your new GraphQL project.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">
            Project Name
          </label>
          <Input placeholder="my-graphql-project" />
        </div>
        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">
            Description
          </label>
          <Input placeholder="A brief description..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button variant="primary">Create</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const DestructiveAction: Story = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="destructive">Delete Account</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you absolutely sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete your
          account and remove all your data from our servers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Yes, delete account</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const NoCloseButton: Story = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>Open (No Close Button)</Button>
    </DialogTrigger>
    <DialogContent hideCloseButton>
      <DialogHeader>
        <DialogTitle>Forced Choice</DialogTitle>
        <DialogDescription>
          This dialog has no close button. You must choose an action.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Option 1</Button>
        <Button variant="primary">Option 2</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-1 max-w-3xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Dialog Colors
      </h2>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 text-sm mb-2">
            <strong>Overlay:</strong> bg-neutral-1.01 with backdrop-blur-sm
          </p>
          <p className="text-neutral-11 text-sm mb-2">
            <strong>Content:</strong> bg-neutral-3 with border-neutral-5
          </p>
          <p className="text-neutral-11 text-sm mb-2">
            <strong>Title:</strong> text-neutral-12
          </p>
          <p className="text-neutral-11 text-sm mb-4">
            <strong>Description:</strong> text-neutral-10
          </p>

          <Dialog>
            <DialogTrigger asChild>
              <Button>View Dialog Colors</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title (neutral-12)</DialogTitle>
                <DialogDescription>
                  Description uses neutral-10 for secondary text. The overlay
                  provides a backdrop blur effect.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-2">
                <p className="text-neutral-11 text-sm">
                  Content text uses neutral-11 for body text.
                </p>
                <div className="p-3 bg-neutral-4 rounded">
                  <p className="text-neutral-12 text-xs">
                    Nested surfaces use neutral-4
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="primary">Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Dialog Examples
      </h2>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">Create Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Item</DialogTitle>
              <DialogDescription>
                Add a new item to your collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input placeholder="Item name" />
              <Input placeholder="Item description" />
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="primary">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Edit Settings</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Configure your application settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-2">
                <label className="text-neutral-12 text-sm font-medium">
                  API Endpoint
                </label>
                <Input
                  placeholder="https://api.example.com"
                  defaultValue="https://api.example.com/graphql"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="primary">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
);
