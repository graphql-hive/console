import { createPreview, type NavPath } from 'react-foundry';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

export const nav: NavPath = 'Base/Primitives/Accordion';

export const Default = createPreview(() => (
  <div className="w-96">
    <Accordion>
      <AccordionItem value={0}>
        <AccordionTrigger label="Breaking changes" />
        <AccordionContent>
          <p className="text-neutral-11">
            Field <code>User.email</code> was removed from type <code>User</code>.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={1}>
        <AccordionTrigger label="Dangerous changes" />
        <AccordionContent>
          <p className="text-neutral-11">
            Enum value <code>PENDING</code> was added to <code>Status</code>.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={2}>
        <AccordionTrigger label="Safe changes" />
        <AccordionContent>
          <p className="text-neutral-11">Description on type Query has changed.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
));

export const DefaultOpen = createPreview(() => (
  <div className="w-96">
    <Accordion defaultValue={[0]}>
      <AccordionItem value={0}>
        <AccordionTrigger label="Open on mount" />
        <AccordionContent>
          <p className="text-neutral-11">Driven by the `defaultValue` prop.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={1}>
        <AccordionTrigger label="Closed on mount" />
        <AccordionContent>
          <p className="text-neutral-11">Not listed in `defaultValue`.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
));

export const AccentVariant = createPreview(() => (
  <div className="w-96">
    <Accordion defaultValue={[0]}>
      <AccordionItem value={0}>
        <AccordionTrigger label="Accent trigger" variant="accent" />
        <AccordionContent>
          <p className="text-neutral-11">Used where the section needs emphasis.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={1}>
        <AccordionTrigger label="Default trigger" />
        <AccordionContent>
          <p className="text-neutral-11">The standard neutral treatment.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
));
