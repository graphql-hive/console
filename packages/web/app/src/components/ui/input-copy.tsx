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
      <div className="relative flex-grow">
        <Input
          type="text"
          value={props.value}
          readOnly
          className="truncate bg-secondary text-white"
        />
      </div>
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size="icon"
        className="h-10 w-10 flex-shrink-0 bg-secondary"
      >
        {isCopied ? (
          <CheckIcon className="h-4 w-4 text-emerald-500" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
        <span className="sr-only">{isCopied ? 'Copied' : 'Copy'}</span>
      </Button>
    </div>
  );
}
