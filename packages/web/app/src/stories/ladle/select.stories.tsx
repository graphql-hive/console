import type { Story } from "@ladle/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

export const Default: Story = () => (
  <Select>
    <SelectTrigger className="w-[280px]">
      <SelectValue placeholder="Select an option" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
      <SelectItem value="option3">Option 3</SelectItem>
    </SelectContent>
  </Select>
);

export const WithGroups: Story = () => (
  <Select>
    <SelectTrigger className="w-[280px]">
      <SelectValue placeholder="Select a framework" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Frontend</SelectLabel>
        <SelectItem value="react">React</SelectItem>
        <SelectItem value="vue">Vue</SelectItem>
        <SelectItem value="svelte">Svelte</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Backend</SelectLabel>
        <SelectItem value="node">Node.js</SelectItem>
        <SelectItem value="python">Python</SelectItem>
        <SelectItem value="go">Go</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);

export const GhostVariant: Story = () => (
  <Select>
    <SelectTrigger variant="ghost" className="w-[200px]">
      <SelectValue placeholder="Ghost variant" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
      <SelectItem value="option3">Option 3</SelectItem>
    </SelectContent>
  </Select>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-2xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Select Variants
      </h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">
            Default variant (bg-neutral-4, hover:bg-neutral-5)
          </label>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dev">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">
            Ghost variant (minimal styling)
          </label>
          <Select>
            <SelectTrigger variant="ghost" className="w-full">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="eu">Europe</SelectItem>
              <SelectItem value="asia">Asia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Dropdown Colors
      </h2>
      <p className="text-neutral-11 text-sm mb-4">
        Open the select to see dropdown menu colors (bg-neutral-4,
        border-neutral-5)
      </p>
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an item to see colors" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Colors Reference</SelectLabel>
            <SelectItem value="item1">
              Regular item (hover:bg-neutral-5)
            </SelectItem>
            <SelectItem value="item2">
              Selected item (bg-accent text-neutral-12)
            </SelectItem>
            <SelectItem value="item3">Another item</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Real-world Example
      </h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">
            GraphQL Client
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select GraphQL client" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Popular Clients</SelectLabel>
                <SelectItem value="apollo">Apollo Client</SelectItem>
                <SelectItem value="urql">urql</SelectItem>
                <SelectItem value="relay">Relay</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Lightweight</SelectLabel>
                <SelectItem value="graphql-request">
                  graphql-request
                </SelectItem>
                <SelectItem value="fetch">Native Fetch</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">
            Cache Strategy
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select caching strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cache-first">Cache First</SelectItem>
              <SelectItem value="network-only">Network Only</SelectItem>
              <SelectItem value="cache-and-network">
                Cache and Network
              </SelectItem>
              <SelectItem value="no-cache">No Cache</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>
    </div>
  </div>
);
