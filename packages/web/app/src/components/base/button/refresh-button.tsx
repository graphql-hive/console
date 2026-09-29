import { RefreshCw } from 'lucide-react';
import { Button } from './button';

type RefreshButtonProps = {
  onClick: () => void;
  size?: 'compact';
  disabled?: boolean;
};

export function RefreshButton({ onClick, size, disabled }: RefreshButtonProps) {
  return (
    <Button
      layout="iconOnly"
      icon={RefreshCw}
      aria-label="Refresh"
      size={size}
      disabled={disabled}
      onClick={onClick}
    />
  );
}
