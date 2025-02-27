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

  const transitionAbortController = useRef<AbortController | null>(null);
  transitionAbortController.current ||= new AbortController();

  const collapse = (newCollapsed: boolean) => {
    if (!cardRef.current) return;

    setTransitioning(true);

    const first = cardRef.current.getBoundingClientRect();
    const ul = cardRef.current.querySelector('ul');

    if (!ul) {
      setCollapsed(newCollapsed);
      setTransitioning(false);
      return;
    }

    const initialHeight = ul.offsetHeight;

    ul.style.height = `${initialHeight}px`;
    ul.style.overflow = 'hidden';

    setCollapsed(newCollapsed);

    requestAnimationFrame(() => {
      if (!cardRef.current || !ul) return;

      const last = cardRef.current.getBoundingClientRect();

      if (window.innerWidth <= 640) {
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;

        cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        const prevHeight = ul.style.height;
        const prevOverflow = ul.style.overflow;

        ul.style.position = 'absolute';
        ul.style.visibility = 'hidden';
        ul.style.height = 'auto';
        ul.style.opacity = newCollapsed ? '1' : '0';

        const targetHeight = ul.scrollHeight + (newCollapsed ? 0 : 24);

        ul.style.position = '';
        ul.style.visibility = '';
        ul.style.height = prevHeight;
        ul.style.overflow = prevOverflow;

        // Force reflow
        void ul.offsetHeight;

        cardRef.current.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
        ul.style.transition =
          'height 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';

        requestAnimationFrame(() => {
          if (!cardRef.current || !ul) return;

          cardRef.current.style.transform = 'none';
          ul.style.height = newCollapsed ? '0px' : `${targetHeight}px`;
          ul.style.opacity = newCollapsed ? '0' : '1';
          const onTransitionEnd = (e: TransitionEvent) => {
            console.log('transitionend', e.target);
            if (e.target !== cardRef.current) return;

            if (!cardRef.current) return;
            cardRef.current.style.transition = '';
            cardRef.current.removeEventListener('transitionend', onTransitionEnd);

            if (!newCollapsed) {
              ul.style.height = 'auto';
              ul.style.overflow = '';
            }

            ul.style.transition = '';

            setTransitioning(false);
          };

          cardRef.current.addEventListener('transitionend', onTransitionEnd, {
            signal: transitionAbortController.current?.signal,
          });
        });
      } else {
        // Clean up any inline styles if we're not on mobile
        ul.style.height = '';
        ul.style.overflow = '';
        ul.style.opacity = '';
        setTransitioning(false);
      }
    });
  };

  useEffect(() => {
    document.body.classList.toggle('max-sm:overflow-hidden', !collapsed);

    const abortController = new AbortController();

    if (!collapsed) {
      // rotating the phone closes the modal
      window.addEventListener(
        'resize',
        function onResize() {
          if (window.innerWidth > 640) {
            collapse(true);
            window.removeEventListener('resize', onResize);
          }
        },
        { signal: abortController.signal },
      );

      window.addEventListener(
        'keydown',
        function onEscape(e) {
          if (e.key === 'Escape') {
            // in case somebody presses escape befoere the opening transition finishes
            transitionAbortController.current?.abort();
            collapse(true);
            window.removeEventListener('keydown', onEscape);
          }
        },
        { signal: abortController.signal },
      );
    }

    return () => {
      document.body.classList.remove('max-sm:overflow-hidden');
      abortController.abort();
    };
  }, [collapsed]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-2xl transition-opacity duration-500 sm:hidden',
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        onClick={() => collapse(true)}
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
            'p-4 max-sm:pb-0 sm:p-8',
            !collapsed && 'nextra-scrollbar h-full max-sm:overflow-auto',
          )}
        >
          <header className="relative text-green-800">
            <div className="flex flex-row items-center gap-2">
              <h2 className="text-2xl font-medium">{name}</h2>
              {adjustable && (
                <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-sm font-medium leading-5">
                  Adjust <span className="hidden sm:inline">your plan</span> at any time
                </span>
              )}
            </div>
            <p className="mt-2">{description}</p>
            {!collapsed && (
              <button
                onClick={() => collapse(true)}
                className="absolute right-0 top-1 text-green-800 transition-opacity duration-700 ease-in-out sm:hidden"
                style={{ opacity: 1 }}
                aria-label="Close"
              >
                <Cross2Icon className="size-5" />
              </button>
            )}
          </header>
          <div className="mt-4 h-6 text-[#4F6C6A]">{startingFrom && 'Starting from'}</div>
          <div className="text-5xl font-medium leading-[56px] tracking-[-0.48px]">{price}</div>
          <div className="mt-4 flex *:grow">{callToAction}</div>

          <ul
            className={cn(
              // !important here is not super elegant, but it's cheaper than installing an animation library
              'text-green-800 sm:mt-6 sm:block sm:!h-auto sm:!opacity-100',
              'max-sm:transition-none', // Prevent any transitions on first load
              collapsed ? 'max-sm:h-0 max-sm:overflow-hidden max-sm:opacity-0' : '',
            )}
            data-open={!collapsed}
          >
            {features}
          </ul>

          <button
            onClick={() => collapse(!collapsed)}
            aria-expanded={!collapsed}
            className="border-beige-200 text-green-1000 relative h-12 w-full gap-2 pt-4 text-center font-bold transition-opacity aria-expanded:border-t sm:hidden sm:border-t [[data-open='true']+footer>&]:pointer-events-none"
          >
            <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 [[aria-expanded=false]>&]:delay-700 [[aria-expanded=true]>&]:opacity-0">
              Show key features
              <ChevronDownIcon className="size-6" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 [[aria-expanded=false]>&]:opacity-0 [[aria-expanded=true]>&]:delay-1000">
              Hide key features
              <ChevronDownIcon className="size-6 rotate-180" />
            </span>
          </button>
        </div>
      </article>
    </>
  );
}
