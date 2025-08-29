import { ReactNode } from 'react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Accordion } from '@/components/v2';
import type { Change } from '@graphql-inspector/core';
import { labelize } from '../history/errors-and-changes';

export function ProposalChangeDetail(props: {
  change: Change<any>;
  error?: Error;
  icon?: ReactNode;
}) {
  return (
    <Accordion type="single">
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 text-gray-600 hover:no-underline dark:text-white">
            <div className="inline-flex items-center justify-start space-x-2">
              <span className="text-left">{labelize(props.change.message)}</span>
              {props.icon}
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
          {props.error?.message ?? <>No details available for this change.</>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
