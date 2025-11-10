import { ChevronDown } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import { Content, Header, Item, Root, Trigger } from '@radix-ui/react-accordion';

const Accordion = Root;
const AccordionHeader = Header;

const AccordionItem = createForwardRefComponent(Item)(({ className, ...props }, ref) => (
  <Item ref={ref} className={cn('border-b', className)} {...props} />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTriggerPrimitive = Trigger;

const AccordionTrigger = createForwardRefComponent(Trigger)(
  ({ className, children, ...props }, ref) => (
    <AccordionTriggerPrimitive
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 font-medium hover:underline [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 transition-transform duration-200" />
    </AccordionTriggerPrimitive>
  ),
);
AccordionTrigger.displayName = Trigger.displayName;

const AccordionContent = createForwardRefComponent(Content)(
  ({ className, children, ...props }, ref) => (
    <Content ref={ref} className="overflow-hidden text-sm data-[state=closed]:hidden" {...props}>
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </Content>
  ),
);

AccordionContent.displayName = Content.displayName;

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionTriggerPrimitive,
  AccordionContent,
  AccordionHeader,
};
