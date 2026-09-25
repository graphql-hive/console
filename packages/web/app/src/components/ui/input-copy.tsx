import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { Input } from '@/components/base/input/input';
import type { OnSurface } from '@/components/base/shared-styles';
import { Textarea } from '@/components/base/textarea/textarea';
import { useClipboard } from '@/lib/hooks';

export function InputCopy(props: {
  value: string;
  multiline?: boolean;
  prefixText?: string;
  /** `raised` inside a dialog, a sheet or a raised card, like any other field there. */
  onSurface?: OnSurface;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = useClipboard();

  useEffect(() => {
    if (!isCopied) return;
    const timerId = setTimeout(() => {
      setIsCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timerId);
    };
  }, [isCopied]);

  const handleClick = useCallback(async () => {
    await copyToClipboard(props.value);
    setIsCopied(true);
  }, [copyToClipboard, props.value]);

  return (
    <div className="flex w-full max-w-2xl items-center space-x-2">
      {props.multiline ? (
        <Textarea
          value={props.value}
          readOnly
          autoSize
          mono
          onSurface={props.onSurface}
          onFocus={ev => ev.target.select()}
        />
      ) : (
        <div className="grow">
          <Input
            type="text"
            value={props.value}
            readOnly
            mono
            onSurface={props.onSurface}
            prefixText={props.prefixText}
            onFocus={ev => ev.target.select()}
          />
        </div>
      )}
      <div className="shrink-0 self-baseline">
        <Button
          type="button"
          onClick={handleClick}
          variant="outline"
          layout="iconOnly"
          icon={isCopied ? CheckIcon : CopyIcon}
          aria-label={isCopied ? 'Copied' : 'Copy'}
        />
      </div>
    </div>
  );
}
