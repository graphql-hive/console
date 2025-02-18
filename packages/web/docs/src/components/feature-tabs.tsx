'use client';

import { createContext, ReactNode, useContext, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import NextLink from 'next/link';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as Tabs from '@radix-ui/react-tabs';
import { CallToAction, cn, Heading } from '@theguild/components';
import { ArrowIcon } from './arrow-icon';

export type Highlight = {
  title: string;
  description: string;
  image?: StaticImageData;
  link?: string;
};

export interface FeatureTabsProps<T extends string> {
  className?: string;
  highlights: Record<T, Highlight[]>;
  icons: React.ReactNode[];
  children: React.ReactNode;
  /**
   * On very narrow screens, we shorten the tab names.
   */
  tabTexts?: Partial<Record<T, ReactNode>>;
}

export function FeatureTabs<T extends string>({
  className,
  highlights,
  icons,
  children,
  tabTexts = {},
}: FeatureTabsProps<T>) {
  const tabs = Object.keys(highlights) as T[];
  const [currentTab, setCurrentTab] = useState<T>(tabs[0]);

  const allHighlights = Object.values<Highlight[]>(highlights).flat();

  const smallScreenTabHandlers = useSmallScreenTabsHandlers();
  const [activeHighlight, setActiveHighlight] = useState(allHighlights[0].title);

  return (
    <section
      className={cn(
        'border-beige-400 isolate mx-auto w-[1248px] max-w-full rounded-3xl bg-white',
        '[--tab-bg-dark:theme(colors.beige.600)] [--tab-bg:theme(colors.beige.200)] sm:max-w-[calc(100%-4rem)] sm:border md:p-6',
        className,
      )}
    >
      <FeatureTabsContext.Provider value={{ activeHighlight, setActiveHighlight, highlights }}>
        <Tabs.Root
          {...smallScreenTabHandlers}
          onValueChange={value => {
            const tab = value as T;
            setCurrentTab(tab);
            setActiveHighlight(highlights[tab][0].title);
            smallScreenTabHandlers.onValueChange();
          }}
          value={currentTab}
        >
          <Tabs.List className='group relative z-10 mx-4 my-6 flex flex-col overflow-hidden focus-within:overflow-visible max-sm:h-[58px] max-sm:focus-within:pointer-events-none max-sm:focus-within:rounded-b-none max-sm:focus-within:has-[>:nth-child(2)[data-state="active"]]:translate-y-[-100%] max-sm:focus-within:has-[>:nth-child(3)[data-state="active"]]:translate-y-[-200%] sm:flex-row sm:rounded-2xl sm:bg-[--tab-bg] md:mx-0 md:mb-12 md:mt-0'>
            {tabs.map((tab, i) => {
              return (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className='hive-focus rdx-state-active:text-green-1000 rdx-state-active:border-[--tab-bg-dark] rdx-state-active:bg-white max-sm:rdx-state-inactive:hidden group-focus-within:rdx-state-inactive:flex max-sm:rdx-state-inactive:rounded-none max-sm:group-focus-within:rdx-state-inactive:border-y-[--tab-bg] max-sm:group-focus-within:[&:nth-child(2)]:rdx-state-active:rounded-none max-sm:group-focus-within:[&:nth-child(2)]:rdx-state-active:border-y-[--tab-bg] max-sm:group-focus-within:first:rdx-state-active:border-b-[--tab-bg] max-sm:group-focus-within:first:rdx-state-active:rounded-b-none max-sm:rdx-state-inactive:pointer-events-none max-sm:rdx-state-inactive:group-focus-within:pointer-events-auto z-10 flex flex-1 items-center justify-center gap-2.5 rounded-lg border-transparent p-4 text-base font-medium leading-6 text-green-800 max-sm:border max-sm:border-[--tab-bg-dark] max-sm:bg-[--tab-bg] max-sm:group-focus-within:aria-selected:z-20 max-sm:group-focus-within:aria-selected:ring-4 sm:rounded-[15px] sm:border sm:text-xs sm:max-lg:p-3 sm:max-[721px]:p-2 md:text-sm lg:text-base max-sm:group-focus-within:[&:last-child]:border-t-[--tab-bg] max-sm:group-focus-within:[&:nth-child(3)]:rounded-t-none [&>svg]:shrink-0 max-sm:group-focus-within:[&[data-state="inactive"]:first-child]:rounded-t-lg max-sm:group-focus-within:[&[data-state="inactive"]:first-child]:border-t-[--tab-bg-dark] [&[data-state="inactive"]>:last-child]:invisible max-sm:group-focus-within:[[data-state="active"]+&:last-child]:rounded-b-lg max-sm:group-focus-within:[[data-state="active"]+&:last-child]:border-b-[--tab-bg-dark] max-sm:group-focus-within:[[data-state="inactive"]+&:last-child[data-state="inactive"]]:rounded-b-lg max-sm:group-focus-within:[[data-state="inactive"]+&:last-child[data-state="inactive"]]:border-b-[--tab-bg-dark]'
                >
                  {icons[i]}
                  {tabTexts[tab] || tab}
                  <ChevronDownIcon className="ml-auto size-6 text-green-800 transition group-focus-within:rotate-90 sm:hidden" />
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
          <div className="grid grid-cols-1 lg:grid-cols-2">{children}</div>
        </Tabs.Root>
      </FeatureTabsContext.Provider>
    </section>
  );
}

interface FeatureProps {
  title: string;
  description?: string;
  highlights: Highlight[];
  documentationLink?:
    | string
    | {
        text: string;
        href: string;
      };
  setActiveHighlight: (highlight: string) => void;
}

function Feature({
  title,
  description,
  documentationLink,
  highlights,
  setActiveHighlight,
}: FeatureProps) {
  if (typeof documentationLink === 'string') {
    documentationLink = {
      text: 'Learn more',
      href: documentationLink,
    };
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-4 md:gap-12 md:px-8 md:pb-12">
      <header className="flex flex-wrap items-center gap-4 md:flex-col md:items-start md:gap-6">
        <Heading as="h2" size="md" className="text-green-1000 max-sm:text-2xl max-sm:leading-8">
          {title}
        </Heading>
        {description && <p className="basis-full leading-6 text-green-800">{description}</p>}
      </header>
      <dl className="grid grid-cols-2 gap-4 md:gap-12">
        {highlights.map((highlight, i) => {
          if (highlight.link) {
            return (
              <NextLink
                href={highlight.link}
                key={i}
                title={'Learn more about ' + highlight.title}
                onPointerOver={() => setActiveHighlight(highlight.title)}
                className="hover:bg-beige-100 -m-2 block rounded-lg p-2 md:-m-4 md:rounded-xl md:p-4"
              >
                <dt className="text-green-1000 font-medium">{highlight.title}</dt>
                <dd className="mt-2 text-sm leading-5 text-green-800">{highlight.description}</dd>
              </NextLink>
            );
          }

          return (
            <div
              key={i}
              onPointerOver={() => setActiveHighlight(highlight.title)}
              className="hover:bg-beige-100 -m-2 rounded-lg p-2 md:-m-4 md:rounded-xl md:p-4"
            >
              <dt className="text-green-1000 font-medium">{highlight.title}</dt>
              <dd className="mt-2 text-sm leading-5 text-green-800">{highlight.description}</dd>
            </div>
          );
        })}
      </dl>
      {documentationLink && (
        <CallToAction variant="primary" href={documentationLink.href}>
          {documentationLink.text}
          <span className="sr-only">
            {/* descriptive text for screen readers and SEO audits */} about {title}
          </span>
          <ArrowIcon />
        </CallToAction>
      )}
    </div>
  );
}

function useSmallScreenTabsHandlers() {
  const isSmallScreen = () => window.innerWidth < 640;
  return {
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      const tabs = event.currentTarget.querySelectorAll('[role="tablist"] > [role="tab"]');
      for (const tab of tabs) {
        tab.ariaSelected = 'false';
      }
    },
    onValueChange: () => {
      if (!isSmallScreen()) return;
      setTimeout(() => {
        const activeElement = document.activeElement;
        // This isn't a perfect dropdown for keyboard users, but we only render it on mobiles.
        if (activeElement && activeElement instanceof HTMLElement && activeElement.role === 'tab') {
          activeElement.blur();
        }
      }, 0);
    },
    // edge case, but people can plug in keyboards to phones
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        !isSmallScreen() ||
        (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter')
      ) {
        return;
      }
      event.preventDefault();

      // We proceed only if the tablist is focused.
      const activeElement = document.activeElement;
      if (
        !activeElement ||
        !(activeElement instanceof HTMLElement) ||
        activeElement.role !== 'tab'
      ) {
        return;
      }

      const items = activeElement.parentElement?.querySelectorAll('[role="tab"]');
      if (!items) {
        return;
      }

      let index = Array.from(items).indexOf(activeElement);
      for (const [i, item] of items.entries()) {
        if (item.ariaSelected === 'true') {
          index = i;
        }
        item.ariaSelected = 'false';
      }

      switch (event.key) {
        case 'ArrowDown':
          index = (index + 1) % items.length;
          break;

        case 'ArrowUp':
          index = (index - 1 + items.length) % items.length;
          break;

        case 'Enter': {
          const item = items[index];
          if (item instanceof HTMLElement) {
            if (item.dataset.state === 'active') {
              item.blur();
            } else {
              item.focus();
            }
          }
          break;
        }
      }

      items[index].ariaSelected = 'true';
    },
  };
}

export interface FeatureTabProps extends Omit<FeatureProps, 'setActiveHighlight'> {}

export function FeatureTab({ title, highlights, description, documentationLink }: FeatureTabProps) {
  const { setActiveHighlight } = useFeatureTabsContext();

  return (
    <Tabs.Content
      value={title}
      // Make it accessible to crawlers, otherwise there's no DOM element to index
      forceMount
      className="data-[state=inactive]:hidden"
      tabIndex={-1}
    >
      <Feature
        title={title}
        description={description}
        documentationLink={documentationLink}
        highlights={highlights}
        setActiveHighlight={setActiveHighlight}
      />
    </Tabs.Content>
  );
}

interface FeatureTabsContextType {
  activeHighlight: string;
  setActiveHighlight: (highlight: string) => void;
  highlights: Record<string, Highlight[]>;
}

const FeatureTabsContext = createContext<FeatureTabsContextType | undefined>(undefined);

export function useFeatureTabsContext() {
  const value = useContext(FeatureTabsContext);
  if (!value) {
    throw new Error('useFeatureTabsContext must be used within a FeatureTabs');
  }
  return value;
}

export function ActiveHighlightImage() {
  const { highlights, activeHighlight } = useFeatureTabsContext();
  const allHighlights = Object.values<Highlight[]>(highlights).flat();

  return (
    <div className="relative mx-4 h-full flex-1 overflow-hidden rounded-3xl bg-blue-400 max-sm:h-[290px] sm:min-h-[400px] md:ml-6 md:mr-0">
      {allHighlights.map(
        (highlight, i) =>
          highlight.image && (
            <div
              key={i}
              data-current={activeHighlight === highlight.title}
              className="absolute inset-0 opacity-0 transition delay-150 duration-150 ease-linear data-[current=true]:z-10 data-[current=true]:opacity-100 data-[current=true]:delay-0"
            >
              <Image
                width={925} // max rendered width is 880px
                height={578} // max rendered height is 618px, and the usual is 554px
                src={highlight.image}
                placeholder="blur"
                blurDataURL={highlight.image.blurDataURL}
                className="absolute left-6 top-[24px] h-[calc(100%-24px)] rounded-tl-3xl object-cover object-left lg:left-[55px] lg:top-[108px] lg:h-[calc(100%-108px)]"
                role="presentation"
                alt=""
              />
            </div>
          ),
      )}
    </div>
  );
}
