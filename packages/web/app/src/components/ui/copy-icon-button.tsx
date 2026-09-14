import { CopyIcon } from 'lucide-react';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { Button } from '@/components/ui/button';
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
          size="icon-xs"
          onClick={() => clipboard(props.value)}
          className="ml-auto"
        >
          <CopyIcon size="10" />
        </Button>
      }
      content={props.label}
      disableHoverablePopup
    />
  );
}
