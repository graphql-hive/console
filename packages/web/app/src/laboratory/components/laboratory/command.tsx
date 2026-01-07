import { useEffect, useState } from 'react';
import { FilePlus2Icon, FolderPlusIcon, PlayIcon, RefreshCcwIcon, ServerIcon } from 'lucide-react';
import { useLaboratory } from '@/laboratory/components/laboratory/context';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/laboratory/components/ui/command';

export function Command(props: { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const {
    endpoint,
    openAddCollectionDialog,
    addOperation,
    runActiveOperation,
    fetchSchema,
    addTab,
    setActiveTab,
    tabs,
    preflight,
    env,
  } = useLaboratory();
  const [open, setOpen] = useState(props.open ?? false);

  useEffect(() => {
    setOpen(props.open ?? false);
  }, [props.open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const newOpen = !open;
        setOpen(newOpen);
        props.onOpenChange?.(newOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, props]);

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={newOpen => {
          setOpen(newOpen);
          props.onOpenChange?.(newOpen);
        }}
      >
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Operations">
            <CommandItem
              disabled={!endpoint}
              onSelect={() => {
                void runActiveOperation(endpoint!);
                setOpen(false);
              }}
            >
              <PlayIcon />
              <span>Run operation</span>
              <CommandShortcut>⌘↵</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                const newOperation = addOperation({
                  name: '',
                  query: '',
                  variables: '',
                  headers: '',
                  extensions: '',
                });
                const tab = addTab({
                  type: 'operation',
                  data: newOperation,
                });

                setActiveTab(tab);
                setOpen(false);
              }}
            >
              <FilePlus2Icon />
              <span>Add operation</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Collections">
            <CommandItem
              onSelect={() => {
                openAddCollectionDialog?.();
                setOpen(false);
              }}
            >
              <FolderPlusIcon />
              <span>Add collection</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Schema">
            {/* <CommandItem
              onSelect={() => {
                openUpdateEndpointDialog?.();
                setOpen(false);
              }}
            >
              <ServerIcon />
              <span>Update endpoint</span>
            </CommandItem> */}
            <CommandItem
              onSelect={() => {
                fetchSchema();
                setOpen(false);
              }}
            >
              <RefreshCcwIcon />
              <span>Refetch schema</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => {
                const tab =
                  tabs.find(t => t.type === 'env') ??
                  addTab({
                    type: 'env',
                    data: env ?? { variables: {} },
                  });

                setActiveTab(tab);
                setOpen(false);
              }}
            >
              <ServerIcon />
              <span>Open Environment Variables</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                const tab =
                  tabs.find(t => t.type === 'preflight') ??
                  addTab({
                    type: 'preflight',
                    data: preflight ?? { script: '' },
                  });

                setActiveTab(tab);
                setOpen(false);
              }}
            >
              <RefreshCcwIcon />
              <span>Open Preflight Script</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
