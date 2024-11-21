import { Children, ComponentPropsWithoutRef } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Anchor, Heading } from '@theguild/components';
import { cn, usePageFAQSchema } from '../../lib';
import FederationQuestions from './federation-questions.mdx';
import HomeQuestions from './home-questions.mdx';

const a = (props: ComponentPropsWithoutRef<'a'>) => (
  <Anchor
    className="hive-focus rounded underline hover:text-blue-700"
    {...props}
    href={props.href!}
  >
    {props.children!}
  </Anchor>
);

const h2 = (props: ComponentPropsWithoutRef<'h2'>) => (
  <Heading as="h2" size="md" className="basis-1/2" {...props} />
);

const ul = (props: ComponentPropsWithoutRef<'ul'>) => (
  <Accordion.Root asChild type="single" collapsible>
    <ul className="basis-1/2 divide-y max-xl:grow" {...props} />
  </Accordion.Root>
);

const li = (props: ComponentPropsWithoutRef<'li'>) => {
  const texts = Children.toArray(props.children)
    .map(child =>
      typeof child === 'object' && 'type' in child && child.type === 'p'
        ? (child.props.children as string)
        : null,
    )
    .filter(Boolean);

  if (texts.length === 0) {
    return null;
  }

  if (texts.length < 2) {
    console.error(texts);
    throw new Error(`Expected a question and an answer, got ${texts.length} items`);
  }

  const [question, ...answers] = texts;

  if (!question) return null;

  return (
    <Accordion.Item
      asChild
      value={question}
      className="rdx-state-open:pb-4 relative pb-0 focus-within:z-10"
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
    >
      <li>
        <Accordion.Header>
          <Accordion.Trigger className="hive-focus hover:bg-beige-100/80 -mx-2 my-1 flex w-[calc(100%+1rem)] items-center justify-between rounded-xl bg-white px-2 py-3 text-left font-medium transition-colors duration-[.8s] md:my-2 md:py-4">
            <span itemProp="name">{question}</span>
            <ChevronDownIcon className="size-5 [[data-state='open']_&]:[transform:rotateX(180deg)]" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content
          forceMount
          className="overflow-hidden bg-white text-green-800 data-[state=closed]:hidden"
          itemScope
          itemProp="acceptedAnswer"
          itemType="https://schema.org/Answer"
        >
          <div itemProp="text" className="space-y-2">
            {answers.map((answer, i) => (
              <p key={i}>{answer}</p>
            ))}
          </div>
        </Accordion.Content>
      </li>
    </Accordion.Item>
  );
};

const components = {
  a,
  h2,
  ul,
  li,
};

export function FrequentlyAskedQuestions({ className }: { className?: string }) {
  usePageFAQSchema();

  return (
    <>
      <section
        className={cn(
          className,
          'text-green-1000 flex flex-col gap-x-6 gap-y-2 px-4 py-6 md:flex-row md:px-10 lg:gap-x-24 lg:px-[120px] lg:py-24',
        )}
      >
        <HomeQuestions components={components} />
      </section>
    </>
  );
}

export function FrequentlyAskedFederationQuestions({ className }: { className?: string }) {
  usePageFAQSchema();

  return (
    <>
      <section
        className={cn(
          className,
          'text-green-1000 flex flex-col gap-x-6 gap-y-2 px-4 py-6 md:flex-row md:px-10 lg:gap-x-24 lg:px-[120px] lg:py-24',
        )}
      >
        <FederationQuestions components={components} />
      </section>
    </>
  );
}
