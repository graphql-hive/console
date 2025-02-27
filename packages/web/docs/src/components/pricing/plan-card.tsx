import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { ChevronDownIcon, Cross2Icon } from '@radix-ui/react-icons';
import { cn } from '@theguild/components';

export interface PlanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  description: string;
  price: ReactNode | string;
  startingFrom?: boolean;
  features: ReactNode;
  adjustable: boolean;
  highlighted: boolean;
  callToAction: ReactNode;
}

export function PlanCard({
  name,
  description,
  price,
  startingFrom,
  features,
  adjustable,
  highlighted,
  callToAction,
  className,
  ...rest
}: PlanCardProps): ReactElement {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    document.body.classList.toggle('max-sm:overflow-hidden', !collapsed);

    let onResize: (() => void) | null = null;
    if (!collapsed) {
      // rotating the phone closes the modal
      const handleResize = () => {
        if (window.innerWidth > 640) {
          setCollapsed(true);
          window.removeEventListener('resize', handleResize);
        }
      };

      onResize = handleResize;
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.body.classList.remove('max-sm:overflow-hidden');
      if (onResize) {
        window.removeEventListener('resize', onResize);
      }
    };
  }, [collapsed]);

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xl sm:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      <article
        className={cn(
          'relative isolate rounded-3xl bg-white shadow-[inset_0_0_0_1px_theme(colors.green.400)]',
          'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[linear-gradient(#fff,#fff),linear-gradient(to_bottom,#E1FF00,#DEDACF,#68A8B6)] before:p-[4px] before:opacity-0 before:transition-[opacity] before:duration-500 before:content-[""] before:[background-clip:content-box,padding-box]',
          (highlighted || !collapsed) && 'before:opacity-100',
          !collapsed &&
            'max-sm:fixed max-sm:inset-2 max-sm:z-50 max-sm:m-0 max-sm:h-[calc(100vh-16px)] max-sm:bg-white',
          className,
        )}
        {...rest}
      >
        <div
          /* scrollview for mobiles */
          className={cn('p-4 sm:p-8', !collapsed && 'nextra-scrollbar h-full max-sm:overflow-auto')}
        >
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="absolute right-4 top-5 text-green-800 sm:hidden"
              aria-label="Close"
            >
              <Cross2Icon className="size-5" />
            </button>
          )}

          <header className="text-green-800">
            <div className="flex flex-row items-center gap-2">
              <h2 className="text-2xl font-medium">{name}</h2>
              {adjustable && (
                <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-sm font-medium leading-5">
                  Adjust <span className="hidden sm:inline">your plan</span> at any time
                </span>
              )}
            </div>
            <p className="mt-2">{description}</p>
          </header>
          <div className="mt-4 h-6 text-[#4F6C6A]">{startingFrom && 'Starting from'}</div>
          <div className="text-5xl font-medium leading-[56px] tracking-[-0.48px]">{price}</div>
          <div className="mt-4 flex *:grow">{callToAction}</div>

          <ul
            className="mt-6 text-green-800 max-sm:data-[open=false]:hidden sm:block"
            data-open={!collapsed}
          >
            {features}
          </ul>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="border-beige-200 text-green-1000 mt-6 flex w-full items-center justify-center gap-2 border-t pt-4 text-center font-bold sm:hidden"
            aria-expanded={collapsed}
          >
            {collapsed ? 'Show' : 'Hide'} key features
            <ChevronDownIcon
              className={cn('size-6 transition-transform', !collapsed && 'rotate-180')}
            />
          </button>
        </div>
      </article>
    </>
  );
}
