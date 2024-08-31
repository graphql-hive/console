import { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib';

export interface HeadingProps extends ComponentPropsWithoutRef<'h1'> {
  as: 'h1' | 'h2' | 'h3' | 'div';
  size: 'xl' | 'lg' | 'md' | 'sm';
}
export function Heading({ as: _as, size, className, children, ...rest }: HeadingProps) {
  const Level = _as || 'h2';

  let sizeStyle = '';
  switch (size) {
    // TODO: This should probably be a class, not a component, because the design expects
    //       an equivalent of `heading-sm lg:heading-xl.`
    case 'xl':
      sizeStyle = 'text-4xl leading-[1.2] md:text-6xl md:leading-[1.1875] tracking-[-0.64px]';
      break;
    case 'md':
      sizeStyle = 'text-4xl leading-[1.2] md:text-5xl md:leading-[1.16667] tracking-[-0.48px]';
      break;
    case 'sm':
      sizeStyle = 'text-[40px] leading-[1.2] tracking-[-0.2px]';
      break;
  }

  const id =
    typeof children === 'string' ? children.replace(/[\s\.,]+/g, '-').toLowerCase() : undefined;

  return (
    <Level className={cn(sizeStyle, className)} id={id} {...rest}>
      {id ? (
        <a href={`#${id}`} className="cursor-text" tabIndex={-1}>
          {children}
        </a>
      ) : (
        children
      )}
    </Level>
  );
}