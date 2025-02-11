import { useCallback, useEffect, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cross2Icon, InfoCircledIcon, TriangleRightIcon } from '@radix-ui/react-icons';
import { LogRecord, PreflightWorkerState } from '../shared-types';
import { EditorTitle } from './EditorTitle';
import { EnvironmentEditor } from './EnvironmentEditor';
import { LogLine } from './LogLine';
import { ScriptEditor } from './ScriptEditor';

export interface PreflightModalEditorValue {
  scriptEditorValue: string;
  environmentEditorValue: string;
}

export function PreflightModal({
  isOpen,
  toggle,
  onSave,
  state,
  execute,
  abortExecution,
  logs,
  clearLogs,
  scriptEditorValue: scriptEditorValueInit,
  environmentEditorValue: environmentEditorValueInit,
}: {
  onSave?: (values: PreflightModalEditorValue) => void;
  isOpen: boolean;
  toggle: () => void;
  state: PreflightWorkerState;
  execute: (script: string) => void;
  abortExecution: () => void;
  logs: Array<LogRecord>;
  clearLogs: () => void;
  scriptEditorValue?: string;
  environmentEditorValue?: string;
}) {
  const [scriptEditorValue, setScriptEditorValue] = useState(scriptEditorValueInit ?? '');
  const [environmentEditorValue, setEnvironmentEditorValue] = useState(
    environmentEditorValueInit ?? '',
  );
  const consoleRef = useRef<HTMLElement>(null);
  const handleSave = useCallback(() => {
    onSave?.({
      scriptEditorValue: scriptEditorValue,
      environmentEditorValue: environmentEditorValue,
    });
    toggle();
  }, []);

  useEffect(() => {
    const consoleEl = consoleRef.current;
    consoleEl?.scroll({ top: consoleEl.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          abortExecution();
        }
        toggle();
      }}
    >
      <DialogContent
        className="w-11/12 max-w-[unset] xl:w-4/5"
        onEscapeKeyDown={ev => {
          // prevent pressing escape in monaco to close the modal
          if (ev.target instanceof HTMLTextAreaElement) {
            ev.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit your Preflight Script</DialogTitle>
          <DialogDescription>
            This script will run in each user's browser and be stored in plain text on our servers.
            Don't share any secrets here.
            <br />
            All team members can view the script and toggle it off when they need to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid h-[60vh] grid-cols-2 [&_section]:grow">
          <div className="mr-4 flex flex-col">
            <div className="flex justify-between p-2">
              <EditorTitle className="flex gap-2">
                Script Editor
                <Badge className="text-xs" variant="outline">
                  JavaScript
                </Badge>
              </EditorTitle>
              <Button
                variant="orangeLink"
                size="icon-sm"
                className="size-auto gap-1"
                onClick={() => {
                  if (state === PreflightWorkerState.running) {
                    abortExecution();
                    return;
                  }

                  execute(scriptEditorValue);
                }}
                data-cy="run-preflight"
              >
                {state === PreflightWorkerState.running && (
                  <>
                    <Cross2Icon className="shrink-0" />
                    Stop Script
                  </>
                )}
                {state === PreflightWorkerState.ready && (
                  <>
                    <TriangleRightIcon className="shrink-0" />
                    Run Script
                  </>
                )}
              </Button>
            </div>
            <ScriptEditor
              value={scriptEditorValue}
              onChange={value => setScriptEditorValue(value ?? '')}
              options={{
                wordWrap: 'wordWrapColumn',
              }}
              wrapperProps={{
                ['data-cy']: 'preflight-editor',
              }}
            />
          </div>
          <div className="flex h-[inherit] flex-col">
            <div className="flex justify-between p-2">
              <EditorTitle>Console Output</EditorTitle>
              <Button
                variant="orangeLink"
                size="icon-sm"
                className="size-auto gap-1"
                onClick={clearLogs}
                disabled={state === PreflightWorkerState.running}
              >
                <Cross2Icon className="shrink-0" height="12" />
                Clear Output
              </Button>
            </div>
            <section
              ref={consoleRef}
              className="h-1/2 overflow-hidden overflow-y-scroll bg-[#10151f] py-2.5 pl-[26px] pr-2.5 font-mono text-xs/[18px]"
              data-cy="console-output"
            >
              {logs.map((log, index) => (
                <LogLine key={index} log={log} />
              ))}
            </section>
            <EditorTitle className="flex gap-2 p-2">
              Environment Variables
              <Badge className="text-xs" variant="outline">
                JSON
              </Badge>
            </EditorTitle>
            <EnvironmentEditor
              value={environmentEditorValue}
              onChange={value => setEnvironmentEditorValue(value ?? '')}
              options={{
                wordWrap: 'wordWrapColumn',
              }}
              wrapperProps={{
                ['data-cy']: 'env-editor',
              }}
            />
          </div>
        </div>
        <DialogFooter className="items-center">
          <p className="me-5 flex items-center gap-2 text-sm">
            <InfoCircledIcon />
            Changes made to this Preflight Script will apply to all users on your team using this
            target.
          </p>
          <Button type="button" onClick={toggle} data-cy="preflight-modal-cancel">
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            data-cy="preflight-modal-submit"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
