import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/lib/hooks';

export function InputCopy(props: { value: string; multiline?: boolean; prefixText?: string }) {
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
        <Textarea value={props.value} readOnly autoSize mono onFocus={ev => ev.target.select()} />
      ) : (
        <div className="grow">
          <Input
            type="text"
            value={props.value}
            readOnly
            mono
            prefixText={props.prefixText}
            onFocus={ev => ev.target.select()}
          />
        </div>
      )}
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="icon"
        className="bg-neutral-2 size-9 shrink-0 self-baseline"
      >
        {isCopied ? (
          <CheckIcon className="size-4 text-emerald-500" />
        ) : (
          <CopyIcon className="size-4" />
        )}
        <span className="sr-only">{isCopied ? 'Copied' : 'Copy'}</span>
      </Button>
    </div>
  );
}
