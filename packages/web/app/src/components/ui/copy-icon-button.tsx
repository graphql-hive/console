import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { useClipboard } from '@/lib/hooks';

type CopyIconButtonProps = {
  label: string;
  value: string;
};

export function CopyIconButton(props: CopyIconButtonProps) {
  const clipboard = useClipboard();
  return (
    <Tooltip
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={props.label}
          onClick={() => clipboard(props.value)}
        >
          <CopyIcon className="size-3" />
        </Button>
      }
      content={props.label}
      disableHoverablePopup
    />
  );
}
