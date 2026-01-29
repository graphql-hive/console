import type { Story } from "@ladle/react";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const SimpleCard: Story = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>This is a card description</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-neutral-11">Card content goes here</p>
    </CardContent>
  </Card>
);

export const WithFooter: Story = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>Project Configuration</CardTitle>
      <CardDescription>Manage your project settings</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-neutral-11 text-sm">
        Configure your project's GraphQL schema, endpoints, and other settings.
      </p>
    </CardContent>
    <CardFooter className="gap-2">
      <Button variant="outline" size="sm">
        Cancel
      </Button>
      <Button variant="primary" size="sm">
        Save
      </Button>
    </CardFooter>
  </Card>
);

export const WithBadges: Story = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <div className="flex items-start justify-between">
        <CardTitle>API Endpoint</CardTitle>
        <Badge variant="success">Active</Badge>
      </div>
      <CardDescription>https://api.example.com/graphql</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 text-sm text-neutral-11">
        <div className="flex justify-between">
          <span>Requests:</span>
          <span className="text-neutral-12">1.2M</span>
        </div>
        <div className="flex justify-between">
          <span>Errors:</span>
          <span className="text-neutral-12">0.01%</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-6 p-8 bg-neutral-1">
    <h2 className="text-neutral-12 text-xl font-bold">Card Surface Colors</h2>

    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>Using default card styling</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-11 text-sm">
            Card background: gray-900/50 with border
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-neutral-12">Title (neutral-12)</CardTitle>
          <CardDescription className="text-neutral-10">
            Description (neutral-10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-11 text-sm">Content (neutral-11)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>With Status Badge</CardTitle>
          <CardDescription>Card with semantic colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="failure">Failure</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>With buttons and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-11 text-sm mb-3">
            Cards can contain interactive elements
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              View
            </Button>
            <Button size="sm" variant="primary">
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Neutral Color Scale in Cards</CardTitle>
        <CardDescription>
          Showing how different neutral levels look on card surfaces
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="p-3 rounded bg-neutral-1 border border-neutral-5">
            <span className="text-neutral-12 text-sm">neutral-1 background</span>
          </div>
          <div className="p-3 rounded bg-neutral-2 border border-neutral-5">
            <span className="text-neutral-12 text-sm">neutral-2 background</span>
          </div>
          <div className="p-3 rounded bg-neutral-3 border border-neutral-5">
            <span className="text-neutral-12 text-sm">neutral-3 background</span>
          </div>
          <div className="p-3 rounded bg-neutral-4 border border-neutral-5">
            <span className="text-neutral-12 text-sm">neutral-4 background</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
