import { ReactElement } from 'react';
import { clsx } from 'clsx';
import * as S from '@radix-ui/react-slider';

export function Slider(props: S.SliderProps): ReactElement {
  return (
    <S.Root aria-label="value" className="relative flex h-5 touch-none items-center" {...props}>
      <S.Track className="bg-neutral-12 relative h-1 w-full grow rounded-full">
        <S.Range className="bg-neutral-12 absolute h-full rounded-full" />
      </S.Track>
      <S.Thumb className={clsx('bg-neutral-12 block size-5 rounded-full', 'focus-within:ring')} />
    </S.Root>
  );
}
