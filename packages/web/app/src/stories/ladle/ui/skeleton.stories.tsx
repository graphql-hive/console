import type { Story } from '@ladle/react';
import { Skeleton } from '@/components/ui/skeleton';

export const Default: Story = () => <Skeleton className="h-12 w-48" />;

export const Shapes: Story = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <p className="text-sm text-neutral-11">Rectangle</p>
      <Skeleton className="h-12 w-64" />
    </div>
    <div className="space-y-2">
      <p className="text-sm text-neutral-11">Square</p>
      <Skeleton className="size-24" />
    </div>
    <div className="space-y-2">
      <p className="text-sm text-neutral-11">Circle (Avatar)</p>
      <Skeleton className="size-12 rounded-full" />
    </div>
    <div className="space-y-2">
      <p className="text-sm text-neutral-11">Thin Line (Text)</p>
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  </div>
);

export const TextPlaceholder: Story = () => (
  <div className="space-y-3 max-w-md">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

export const CardSkeleton: Story = () => (
  <div className="max-w-md p-6 border border-neutral-6 rounded-lg space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const TableSkeleton: Story = () => (
  <div className="max-w-2xl space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="size-10 rounded" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export const FormSkeleton: Story = () => (
  <div className="max-w-md space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-32 w-full" />
    </div>
    <Skeleton className="h-10 w-32" />
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Skeleton Component</h2>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Skeleton</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Skeleton className="h-12 w-48" />
          </div>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-primary/10</code>
            <br />
            Animation: <code className="text-neutral-12">animate-pulse</code>
            <br />
            Border radius: <code className="text-neutral-12">rounded-md</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Shapes</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Rectangle</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Skeleton className="h-12 w-64" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Square</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Skeleton className="size-24" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Circle (Avatar)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Skeleton className="size-12 rounded-full" />
          </div>
          <p className="text-xs text-neutral-10">
            Use <code className="text-neutral-12">rounded-full</code> for circles
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Text Line</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Examples</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Text Paragraph</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-3 max-w-md">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Card with Avatar</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-md p-6 border border-neutral-6 rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Table Rows</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-2xl space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Form Fields</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
