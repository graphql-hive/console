import { cn } from '@/laboratory/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-neutral-4 placeholder:text-neutral-10 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500 dark:bg-neutral-4/30 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
