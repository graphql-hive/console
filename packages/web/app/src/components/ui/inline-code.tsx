import { CopyIcon } from 'lucide-react';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { inlineCodeStyles } from './inline-code.css';

export const InlineCode = (props: { content: string }) => {
  const { toast } = useToast();
  return (
    <span className={inlineCodeStyles.root}>
      <code className={inlineCodeStyles.code}>{props.content}</code>
      <button
        className={inlineCodeStyles.copyButton}
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
