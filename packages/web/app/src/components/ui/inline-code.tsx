import { CopyIcon } from 'lucide-react';
import { useToast } from '@/components/ui/primitives/toast/toast';

export const InlineCode = (props: { content: string }) => {
  const { toast } = useToast();
  return (
    <span className="flex items-center gap-2 rounded-md bg-surface-code py-1 font-mono text-sm break-all">
      <code className="grow px-3">{props.content}</code>
      <button
        className="cursor-pointer p-2 hover:text-warning"
        onClick={async ev => {
          ev.preventDefault();
          await navigator.clipboard.writeText(props.content);
          toast({ title: 'Copied to clipboard' });
        }}
        title="Copy to clipboard"
      >
        <CopyIcon size={16} />
      </button>
    </span>
  );
};
