export function RouterHookSection(props: { children: React.ReactNode }) {
  return (
    <div className="group mb-4 scroll-mt-20 overflow-hidden rounded-lg border border-gray-200 p-4 transition-shadow duration-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/30 [&_h3]:mt-0 [&_h3_code]:border-transparent [&_h3_code]:!bg-transparent">
      {props.children}
    </div>
  );
}
