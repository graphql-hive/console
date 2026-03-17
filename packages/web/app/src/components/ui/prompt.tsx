import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PromptProps {
  id: number;
  onClose: (id: number, value: string | null) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  isVisible: boolean;
}

export function Prompt(props: PromptProps) {
  const defaultValue = props.defaultValue || '';
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    props.onClose(props.id, value);
  };

  if (!props.isVisible) {
    return null;
  }

  return (
    <DialogContent data-cy="prompt" hideCloseButton>
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        {props.description && <DialogDescription>{props.description}</DialogDescription>}
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <Input value={value} onChange={e => setValue(e.target.value)} className="mt-4" />
        <DialogFooter className="mt-4">
          <Button
            type="button"
            data-cy="prompt-cancel"
            variant="outline"
            onClick={() => props.onClose(props.id, null)}
          >
            Cancel
          </Button>
          <Button type="submit">OK</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function PromptManager() {
  const { prompts, closePrompt } = usePromptManager();

  return (
    <Dialog open={prompts.length > 0}>
      {prompts.map((prompt, index) => (
        <Prompt
          key={prompt.id}
          id={prompt.id}
          onClose={closePrompt}
          title={prompt.title}
          description={prompt.description}
          defaultValue={prompt.defaultValue}
          isVisible={index === 0}
        />
      ))}
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
