import { CopyIcon } from 'lucide-react';
import { useToast } from '@/components/base/toast/toast';

export const InlineCode = (props: { content: string }) => {
  const { toast } = useToast();
  return (
    <span className="bg-neutral-5 flex items-center gap-2 break-all rounded-md py-1 font-mono text-sm">
      <code className="grow px-3">{props.content}</code>
      <button
        className="hover:text-warning cursor-pointer p-2"
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
