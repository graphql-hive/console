import { cn, Heading } from '@theguild/components';

export function PlanComparison({ className }: { className?: string }) {
  return (
    <section
      className={cn('bg-blueish-green rounded-3xl px-4 py-12 text-center md:p-24', className)}
    >
      <Heading
        as="h2"
        size="md"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white"
      >
        All plans include
        <span className="text-green-1000 inline-block rounded-2xl bg-gradient-to-r from-blue-300 to-blue-500 px-3 py-2">
          every feature
        </span>
      </Heading>
      <p className="mt-8 font-medium text-white/80">
        We do not gate any features. All our plans are fully-featured, with access to the community.
        We only charge a premium for support.
      </p>
    </section>
  );
}
