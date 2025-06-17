import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClipboard } from '@/lib/hooks';

export function InputCopy(props: { value: string; className?: string; multiline?: boolean }) {
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
          onFocus={ev => ev.target.select()}
          className={`bg-secondary w-full resize-none font-mono text-xs text-white ${props.className}`}
        />
      ) : (
        <div className="relative grow">
          <Input
            type="text"
            value={props.value}
            readOnly
            className={`bg-secondary truncate text-white ${props.className}`}
            onFocus={ev => ev.target.select()}
          />
        </div>
      )}
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="icon"
        className="bg-secondary size-10 shrink-0 self-baseline"
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
