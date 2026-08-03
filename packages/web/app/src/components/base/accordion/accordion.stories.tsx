import type { Story, StoryDefault } from '@ladle/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

export default {
  title: 'UI / Accordion',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="max-w-lg p-8">
    <Accordion>
      <AccordionItem value={0}>
        <AccordionTrigger label="Advanced settings" />
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-neutral-11 text-sm">Filter and hold minutes settings go here.</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

export const DefaultOpen: Story = () => (
  <div className="max-w-lg p-8">
    <Accordion defaultValue={[0]}>
      <AccordionItem value={0}>
        <AccordionTrigger label="Advanced settings" />
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-neutral-11 text-sm">This section starts open.</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

export const Multiple: Story = () => (
  <div className="max-w-lg p-8">
    <Accordion>
      <AccordionItem value={0}>
        <AccordionTrigger label="Section one" />
        <AccordionContent>
          <p className="text-neutral-11 text-sm">First section content.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={1}>
        <AccordionTrigger label="Section two" />
        <AccordionContent>
          <p className="text-neutral-11 text-sm">Second section content.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);
