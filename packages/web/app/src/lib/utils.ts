import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ElementType,
} from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pluralize(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return singular;
  }

  return plural;
}

export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `Reached forbidden guard function with unexpected value: ${JSON.stringify(_value)}`,
  );
}

// typescript utils

/** this type inference helper cleans up some of our ui component code */
export function createForwardRefComponent<T extends ElementType>(_Component: T) {
  return forwardRef<ElementRef<T>, ComponentPropsWithoutRef<T>>;
}
