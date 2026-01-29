import { Skeleton } from '@/components/ui/skeleton';
import type { Story } from '@ladle/react';

export const Default: Story = () => <Skeleton className="h-12 w-48" />;

export const Shapes: Story = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <p className="text-neutral-11 text-sm">Rectangle</p>
      <Skeleton className="h-12 w-64" />
    </div>
    <div className="space-y-2">
      <p className="text-neutral-11 text-sm">Square</p>
      <Skeleton className="size-24" />
    </div>
    <div className="space-y-2">
      <p className="text-neutral-11 text-sm">Circle (Avatar)</p>
      <Skeleton className="size-12 rounded-full" />
    </div>
    <div className="space-y-2">
      <p className="text-neutral-11 text-sm">Thin Line (Text)</p>
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  </div>
);

export const TextPlaceholder: Story = () => (
  <div className="max-w-md space-y-3">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

export const CardSkeleton: Story = () => (
  <div className="border-neutral-6 max-w-md space-y-4 rounded-lg border p-6">
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
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Skeleton Component</h2>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Skeleton</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Skeleton className="h-12 w-48" />
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-11/10</code>
            <br />
            Animation: <code className="text-neutral-12">animate-pulse</code>
            <br />
            Border radius: <code className="text-neutral-12">rounded-md</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Shapes</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Rectangle</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Skeleton className="h-12 w-64" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Square</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Skeleton className="size-24" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Circle (Avatar)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Skeleton className="size-12 rounded-full" />
          </div>
          <p className="text-neutral-10 text-xs">
            Use <code className="text-neutral-12">rounded-full</code> for circles
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Text Line</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Text Paragraph</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <div className="max-w-md space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Card with Avatar</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <div className="border-neutral-6 max-w-md space-y-4 rounded-lg border p-6">
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
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
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
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
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
