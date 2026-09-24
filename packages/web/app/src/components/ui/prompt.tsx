import {
  createContext,
  useCallback,
  useContext,
  useState,
  type FC,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/base/button/button';
import { Input } from '@/components/base/input/input';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';

interface PromptProps {
  id: number;
  onClose: (id: number, value: string | null) => void;
  defaultValue?: string;
}

function Prompt(props: PromptProps) {
  const [value, setValue] = useState(props.defaultValue || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    props.onClose(props.id, value);
  };

  return (
    <form id="prompt-form" onSubmit={handleSubmit}>
      <Input value={value} onChange={e => setValue(e.target.value)} onSurface="raised" />
    </form>
  );
}

export function PromptManager() {
  const { prompts, closePrompt } = usePromptManager();
  // The last prompt stays up through the close transition.
  const prompt = useKeepPreviousData(prompts[0], prompts.length === 0);

  return (
    <Dialog
      open={prompts.length > 0}
      onOpenChange={open => {
        if (!open && prompt) {
          closePrompt(prompt.id, null);
        }
      }}
      closeButton={false}
      dismissible={false}
      title={prompt?.title ?? ''}
      description={prompt?.description}
      attrs={{ 'data-cy': 'prompt' }}
      footer={
        prompt ? (
          <>
            <Button
              type="button"
              data-cy="prompt-cancel"
              variant="outline"
              onClick={() => closePrompt(prompt.id, null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="prompt-form" onSurface="raised">
              OK
            </Button>
          </>
        ) : null
      }
    >
      {prompt ? (
        <Prompt
          key={prompt.id}
          id={prompt.id}
          onClose={closePrompt}
          defaultValue={prompt.defaultValue}
        />
      ) : null}
    </Dialog>
  );
}

interface PromptOptions {
  id: number;
  title: string;
  description?: string;
  defaultValue?: string;
}

interface PromptItem extends PromptOptions {
  resolve: (value: string | null) => void;
}

interface PromptContextType {
  openPrompt: (options: PromptOptions) => Promise<string | null>;
  closePrompt: (id: number, value: string | null) => void;
  prompts: PromptItem[];
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  const openPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise(resolve => {
      const newPrompt: PromptItem = {
        ...options,
        resolve,
      };
      setPrompts(prevPrompts => [...prevPrompts, newPrompt]);
    });
  }, []);

  const closePrompt = useCallback((id: number, value: string | null) => {
    setPrompts(prevPrompts => {
      const promptToClose = prevPrompts.find(p => p.id === id);
      if (promptToClose) {
        promptToClose.resolve(value);
      }
      return prevPrompts.filter(p => p.id !== id);
    });
  }, []);

  return (
    <PromptContext.Provider value={{ openPrompt, closePrompt, prompts }}>
      {children}
    </PromptContext.Provider>
  );
};

export const usePromptManager = () => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePromptManager must be used within a PromptProvider');
  }
  return context;
};
