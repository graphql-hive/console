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
  const cardRef = useRef<HTMLElement>(null);

  // FLIP animation handling
  const handleCollapsedChange = (newCollapsed: boolean) => {
    if (!cardRef.current) return;

    // Mark that we're transitioning
    setTransitioning(true);

    // FIRST: Get the initial bounds
    const first = cardRef.current.getBoundingClientRect();
    const ul = cardRef.current.querySelector('ul');

    if (!ul) {
      setCollapsed(newCollapsed);
      setTransitioning(false);
      return;
    }

    // Store initial height for the animation
    const initialHeight = ul.offsetHeight;

    // Set a fixed height before changing state to prevent jumps
    ul.style.height = `${initialHeight}px`;
    ul.style.overflow = 'hidden';

    // Update state
    setCollapsed(newCollapsed);

    // Need to wait for the DOM to update with the new layout
    requestAnimationFrame(() => {
      if (!cardRef.current || !ul) return;

      const last = cardRef.current.getBoundingClientRect();

      if (window.innerWidth <= 640) {
        // INVERT: Calculate the translations needed for the card
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;

        // Apply the inverted translations (only position, not scale)
        cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Temporarily make height auto to measure the target height
        const prevHeight = ul.style.height;
        const prevOverflow = ul.style.overflow;

        ul.style.position = 'absolute'; // Prevent layout changes during measurement
        ul.style.visibility = 'hidden';
        ul.style.height = 'auto';

        // Measure the final height
        const targetHeight = ul.scrollHeight + (newCollapsed ? 0 : 24); // Add padding if expanding

        // Restore
        ul.style.position = '';
        ul.style.visibility = '';
        ul.style.height = prevHeight;
        ul.style.overflow = prevOverflow;

        // Force reflow
        void ul.offsetHeight;

        // PLAY: Animate to the new position and height
        cardRef.current.style.transition = 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)';
        ul.style.transition = 'height 1500ms cubic-bezier(0.16, 1, 0.3, 1)';

        requestAnimationFrame(() => {
          if (!cardRef.current || !ul) return;

          // Animate to target positions
          cardRef.current.style.transform = 'none';
          ul.style.height = newCollapsed ? '0px' : `${targetHeight}px`;

          // Clean up after animation completes
          const onTransitionEnd = (e: TransitionEvent) => {
            // Only handle the card's transition end
            if (e.target !== cardRef.current) return;

            if (!cardRef.current) return;
            cardRef.current.style.transition = '';
            cardRef.current.removeEventListener('transitionend', onTransitionEnd);

            // Clean up styles and set height to auto when open
            if (!newCollapsed) {
              ul.style.height = 'auto';
              ul.style.overflow = '';
            }

            ul.style.transition = '';

            setTransitioning(false);
          };

          cardRef.current.addEventListener('transitionend', onTransitionEnd);
        });
      } else {
        // Clean up any inline styles if we're not on mobile
        ul.style.height = '';
        ul.style.overflow = '';
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
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-2xl transition-opacity duration-500 sm:hidden',
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        onClick={() => handleCollapsedChange(true)}
      />
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
              'mt-6 text-green-800 sm:block',
              collapsed && 'max-sm:overflow-hidden',
              !collapsed && 'max-sm:pb-6',
            )}
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
