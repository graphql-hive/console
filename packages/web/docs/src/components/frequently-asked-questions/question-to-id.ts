import { ReactNode } from 'react';

export function questionToId(question: string | ReactNode) {
  return typeof question === 'string'
    ? `faq--${question.slice(0, -1).replace(/ /g, '-').toLowerCase()}`
    : undefined;
}
