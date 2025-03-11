import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClipboard } from '@/lib/hooks';

export function InputCopy(props: { value: string }) {
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
  }, [copyToClipboard]);

  return (
    <div className="flex w-full max-w-2xl items-center space-x-2">
      <div className="relative grow">
        <Input
          type="text"
          value={props.value}
          readOnly
          className="bg-secondary truncate text-white"
          onFocus={ev => ev.target.select()}
        />
      </div>
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="icon"
        className="bg-secondary size-10 shrink-0"
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
