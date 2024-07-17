import { ReactElement, useCallback, useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from '@/components/ui/icon';
import { Input } from '@/components/v2';
import { useClipboard } from '@/lib/hooks';
import { Button } from '../ui/button';

export const CopyValue = ({
  value,
  className,
}: {
  value: string;
  className?: string;
}): ReactElement => {
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
    await copyToClipboard(value);
    setIsCopied(true);
  }, [value, copyToClipboard]);

  return (
    <Input
      className={className}
      value={value}
      readOnly
      suffix={
        <Button
          size="icon"
          variant="link"
          className="p-0 focus:ring-transparent"
          onClick={handleClick}
          title={isCopied ? 'Copied!' : 'Copy to clipboard'}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      }
    />
  );
};
