import { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';
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
  const [transitioning, setTransitioning] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // Handle backdrop visibility with proper transitions
  useEffect(() => {
    if (!collapsed) {
      // When opening: immediately show backdrop and fade it in
      setShowBackdrop(true);
      // Need a small delay to ensure transition works
      setTimeout(() => setBackdropVisible(true), 10);
    } else {
      // When closing: first fade out, then remove from DOM
      setBackdropVisible(false);
      // Remove backdrop from DOM after transition completes
      const timer = setTimeout(() => setShowBackdrop(false), 700);
      return () => clearTimeout(timer);
    }
  }, [collapsed]);

  // FLIP animation handling
  const handleCollapsedChange = (newCollapsed: boolean) => {
    if (!cardRef.current) return;

    // Mark that we're transitioning
    setTransitioning(true);

    // FIRST: Get the initial bounds
    const first = cardRef.current.getBoundingClientRect();

    // Update state
    setCollapsed(newCollapsed);

    // Need to wait for the DOM to update with the new layout
    requestAnimationFrame(() => {
      if (!cardRef.current) return;

      // LAST: Get the final bounds after state change
      const last = cardRef.current.getBoundingClientRect();

      // Only animate if on mobile
      if (window.innerWidth <= 640) {
        // INVERT: Calculate the translations needed
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;

        // Apply the inverted translations (only position, not scale)
        cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Force reflow to ensure the transform is applied
        const _ = cardRef.current.offsetHeight;

        // PLAY: Animate back to normal position
        cardRef.current.style.transition = 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)';

        requestAnimationFrame(() => {
          if (!cardRef.current) return;
          cardRef.current.style.transform = 'none';

          // Clean up after animation completes
          const onTransitionEnd = () => {
            if (!cardRef.current) return;
            cardRef.current.style.transition = '';
            cardRef.current.removeEventListener('transitionend', onTransitionEnd);
            setTransitioning(false);
          };

          cardRef.current.addEventListener('transitionend', onTransitionEnd);
        });
      } else {
        setTransitioning(false);
      }
    });
  };

  useEffect(() => {
    document.body.classList.toggle('max-sm:overflow-hidden', !collapsed);

    let onResize: (() => void) | null = null;
    if (!collapsed) {
      // rotating the phone closes the modal
      const handleResize = () => {
        if (window.innerWidth > 640) {
          handleCollapsedChange(true);
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
      {showBackdrop && (
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/30 backdrop-blur-2xl transition-opacity duration-700 ease-in-out sm:hidden',
            backdropVisible ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => handleCollapsedChange(true)}
        />
      )}
      <article
        ref={cardRef}
        className={cn(
          'relative isolate rounded-3xl bg-white shadow-[inset_0_0_0_1px_theme(colors.green.400)]',
          'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-[linear-gradient(#fff,#fff),linear-gradient(to_bottom,#E1FF00,#DEDACF,#68A8B6)] before:p-[4px] before:opacity-0 before:transition-[opacity] before:duration-700 before:content-[""] before:[background-clip:content-box,padding-box]',
          (highlighted || !collapsed) && 'before:opacity-100',
          'max-sm:transition-[width,height,border-radius] max-sm:duration-700 max-sm:ease-in-out',
          !collapsed &&
            'max-sm:fixed max-sm:inset-2 max-sm:z-50 max-sm:m-0 max-sm:h-[calc(100vh-16px)] max-sm:bg-white',
          transitioning && 'z-50',
          className,
        )}
        {...rest}
      >
        <div
          /* scrollview for mobiles */
          className={cn(
            'p-4 sm:p-8',
            !collapsed && 'nextra-scrollbar h-full max-sm:overflow-auto',
            transitioning && 'pointer-events-none',
          )}
        >
          {!collapsed && (
            <button
              onClick={() => handleCollapsedChange(true)}
              className="absolute right-4 top-5 text-green-800 transition-opacity duration-700 ease-in-out sm:hidden"
              style={{ opacity: 1 }}
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
            className={cn(
              'mt-6 text-green-800 transition-all sm:block',
              'max-sm:transition-[max-height,padding] max-sm:duration-[1500ms]',
              collapsed
                ? 'max-sm:max-h-0 max-sm:overflow-hidden max-sm:pb-0 max-sm:ease-out'
                : 'max-sm:max-h-[2000px] max-sm:pb-6 max-sm:ease-in',
            )}
            style={{
              transitionDelay: collapsed ? '0ms' : '100ms',
            }}
            data-open={!collapsed}
          >
            {features}
          </ul>

          <button
            onClick={() => handleCollapsedChange(!collapsed)}
            className="border-beige-200 text-green-1000 [aria-expanded=true]:border-t flex w-full items-center justify-center gap-2 pt-4 text-center font-bold sm:mt-6 sm:hidden sm:border-t"
            aria-expanded={!collapsed}
            disabled={transitioning}
          >
            {collapsed ? 'Show' : 'Hide'} key features
            <ChevronDownIcon
              className={cn('size-6 transition-transform duration-700', !collapsed && 'rotate-180')}
            />
          </button>
        </div>
      </article>
    </>
  );
}
