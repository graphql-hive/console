import { CalendarIcon, User } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Hover Card',
};

export const Default: Story = () => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <Button variant="link">@alice</Button>
    </HoverCardTrigger>
    <HoverCardContent>
      <div className="space-y-2">
        <h4 className="text-neutral-12 text-sm font-semibold">Alice Johnson</h4>
        <p className="text-neutral-11 text-sm">
          Full-stack developer working on GraphQL APIs and schema management.
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>
);

export const UserProfile: Story = () => (
  <div className="flex items-center gap-2">
    <p className="text-neutral-11 text-sm">Created by</p>
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link" className="px-0">
          @alice
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar className="size-12">
            <User className="size-6" />
          </Avatar>
          <div className="flex-1 space-y-1">
            <h4 className="text-neutral-12 text-sm font-semibold">Alice Johnson</h4>
            <p className="text-neutral-11 text-sm">Full-stack developer</p>
            <div className="flex items-center pt-2">
              <CalendarIcon className="text-neutral-10 mr-2 size-4 opacity-70" />
              <span className="text-neutral-10 text-xs">Joined December 2023</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  </div>
);

export const OperationInfo: Story = () => (
  <div className="space-y-4">
    <p className="text-neutral-11 text-sm">
      Hover over the{' '}
      <HoverCard>
        <HoverCardTrigger className="text-accent cursor-pointer hover:underline">
          GetUser operation
        </HoverCardTrigger>
        <HoverCardContent side="top">
          <div className="space-y-2">
            <h4 className="text-neutral-12 text-sm font-semibold">GetUser</h4>
            <div className="text-neutral-11 space-y-1 text-xs">
              <p>
                <span className="text-neutral-10">Hash:</span> a1b2c3d4e5f6
              </p>
              <p>
                <span className="text-neutral-10">Total Requests:</span> 1,234,567
              </p>
              <p>
                <span className="text-neutral-10">Last Seen:</span> 2 minutes ago
              </p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>{' '}
      to see details.
    </p>
  </div>
);

export const SchemaTypeInfo: Story = () => (
  <div className="space-y-4">
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <code className="text-sm">
        type{' '}
        <HoverCard>
          <HoverCardTrigger className="text-accent cursor-pointer">User</HoverCardTrigger>
          <HoverCardContent>
            <div className="space-y-2">
              <h4 className="text-neutral-12 text-sm font-semibold">User Type</h4>
              <div className="text-neutral-11 space-y-1 text-xs">
                <p>
                  <span className="text-neutral-10">Kind:</span> Object Type
                </p>
                <p>
                  <span className="text-neutral-10">Fields:</span> 8
                </p>
                <p>
                  <span className="text-neutral-10">Description:</span> Represents a user in the
                  system
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>{' '}
        {'{'}
        <br />
        {'  '}id: ID!
        <br />
        {'  '}email: String!
        <br />
        {'  '}name: String
        <br />
        {'}'}
      </code>
    </div>
  </div>
);

export const Positioning: Story = () => (
  <div className="flex items-center justify-center gap-8 p-12">
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline">Top</Button>
      </HoverCardTrigger>
      <HoverCardContent side="top">
        <p className="text-neutral-11 text-sm">Positioned on top</p>
      </HoverCardContent>
    </HoverCard>

    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline">Right</Button>
      </HoverCardTrigger>
      <HoverCardContent side="right">
        <p className="text-neutral-11 text-sm">Positioned on right</p>
      </HoverCardContent>
    </HoverCard>

    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline">Bottom</Button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom">
        <p className="text-neutral-11 text-sm">Positioned on bottom</p>
      </HoverCardContent>
    </HoverCard>

    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline">Left</Button>
      </HoverCardTrigger>
      <HoverCardContent side="left">
        <p className="text-neutral-11 text-sm">Positioned on left</p>
      </HoverCardContent>
    </HoverCard>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Hover Card Component</h2>
      <p className="text-neutral-11 mb-4">
        Floating card that appears when hovering over a trigger element. Built with Radix UI Hover
        Card.
      </p>
      <p className="text-neutral-10 mb-4 text-sm">
        Note: This component is not currently used in the codebase. Examples show potential use
        cases.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Hover Card</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">Hover over me</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-1">
                  <h4 className="text-neutral-12 text-sm font-semibold">Card Title</h4>
                  <p className="text-neutral-11 text-sm">
                    Additional information appears on hover.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-4</code>
            <br />
            Text: <code className="text-neutral-12">text-neutral-11</code>
            <br />
            Width: <code className="text-neutral-12">w-64</code> (default)
            <br />
            Padding: <code className="text-neutral-12">p-4</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">User Profile Card</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">@username</Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex gap-4">
                  <Avatar className="size-12">
                    <User className="size-6" />
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-neutral-12 text-sm font-semibold">User Name</h4>
                    <p className="text-neutral-11 text-sm">User bio or role</p>
                    <div className="flex items-center pt-2">
                      <CalendarIcon className="text-neutral-10 mr-2 size-4" />
                      <span className="text-neutral-10 text-xs">Joined date</span>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <p className="text-neutral-10 text-xs">
            Custom width: <code className="text-neutral-12">w-80</code>
            <br />
            Useful for showing user profiles, contributor info
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">HoverCard</code>: Root container (manages hover state)
          </li>
          <li>
            <code className="text-neutral-12">HoverCardTrigger</code>: Element that triggers hover
            card
          </li>
          <li>
            <code className="text-neutral-12">HoverCardContent</code>: Floating content that appears
            on hover
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Hover vs Click</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <div className="text-neutral-11 space-y-2 text-sm">
          <p>
            <span className="text-neutral-12 font-medium">HoverCard:</span> Opens on hover, useful
            for quick previews and contextual information
          </p>
          <p>
            <span className="text-neutral-12 font-medium">Popover:</span> Opens on click, better for
            interactive content and forms
          </p>
          <p>
            <span className="text-neutral-12 font-medium">Tooltip:</span> Opens on hover, for short
            text-only hints
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Animation</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 text-xs">
          Open animation: <code className="text-neutral-12">fade-in-0 zoom-in-95</code>
          <br />
          Close animation: <code className="text-neutral-12">fade-out-0 zoom-out-95</code>
          <br />
          Slide animations based on side: <code className="text-neutral-12">slide-in-from-*</code>
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Potential Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">User Mentions</p>
          <p className="text-neutral-10 text-xs">
            Show user profile cards when hovering over @mentions in comments, changelog, or activity
            feeds.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Operation Details</p>
          <p className="text-neutral-10 text-xs">
            Display operation metadata (hash, request count, last seen) when hovering over operation
            names in insights or history.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Schema Type Info</p>
          <p className="text-neutral-10 text-xs">
            Show type information (kind, fields, description) when hovering over type names in
            schema explorer.
          </p>
        </div>
      </div>
    </div>
  </div>
);
