import { AlertCircle, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Tooltip',
};

export const Simple: Story = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const WithIcon: Story = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Additional information</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const DifferentSides: Story = () => (
  <TooltipProvider>
    <div className="flex items-center justify-center gap-12 p-12">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Top</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const MultipleTooltips: Story = () => (
  <TooltipProvider>
    <div className="flex gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Information</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help & Documentation</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <AlertCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Warning: Action required</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const ColorPaletteShowcase: Story = () => (
  <TooltipProvider>
    <div className="bg-neutral-2 max-w-3xl space-y-8 rounded-lg p-8">
      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Tooltip Colors</h2>
        <div className="space-y-4">
          <p className="text-neutral-11 text-sm">
            <strong>Background:</strong> bg-neutral-4
          </p>
          <p className="text-neutral-11 text-sm">
            <strong>Text:</strong> text-neutral-11
          </p>
          <p className="text-neutral-11 text-sm">
            <strong>Border:</strong> border (inherits border color)
          </p>
          <p className="text-neutral-11 mb-4 text-sm">
            <strong>Animation:</strong> fade-in-50 with slide-in from direction
          </p>

          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Background: neutral-4, Text: neutral-11</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="primary">Primary button</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tooltips work with any trigger element</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-neutral-12 mb-3 font-semibold">Icon Tooltips</h3>
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-neutral-11 hover:text-neutral-12 transition-colors">
                    <Info className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View more information</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-neutral-11 hover:text-neutral-12 transition-colors">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get help with this feature</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-neutral-11 hover:text-neutral-12 transition-colors">
                    <AlertCircle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attention: Review before proceeding</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div>
            <h3 className="text-neutral-12 mb-3 font-semibold">Form Field Hints</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-neutral-12 text-sm font-medium">API Key</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-neutral-11 hover:text-neutral-12">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Find your API key in the settings panel</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-neutral-12 text-sm font-medium">GraphQL Endpoint</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-neutral-11 hover:text-neutral-12">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the full URL including protocol (https://)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-neutral-12 mb-3 font-semibold">Disabled Elements</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled>Disabled Button</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>This feature is currently unavailable</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  </TooltipProvider>
);
