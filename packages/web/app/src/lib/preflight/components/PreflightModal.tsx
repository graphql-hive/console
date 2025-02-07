import { useCallback, useEffect, useRef } from 'react';
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
import { MonacoEditorReact } from '@/lib/MonacoEditorReact';
import { Cross2Icon, InfoCircledIcon, TriangleRightIcon } from '@radix-ui/react-icons';
import labApiDefinitionRaw from '../lab-api-declaration?raw';
import { LogRecord, PreflightWorkerState } from '../shared-types';
import { EditorTitle } from './EditorTitle';
import { EnvironmentEditor } from './EnvironmentEditor';
import { LogLine } from './LogLine';
import { ScriptEditor } from './ScriptEditor';

export function PreflightModal({
  isOpen,
  toggle,
  content,
  state,
  execute,
  abortExecution,
  logs,
  clearLogs,
  onContentChange,
  envValue,
  onEnvValueChange,
}: {
  isOpen: boolean;
  toggle: () => void;
  content?: string;
  state: PreflightWorkerState;
  execute: (script: string) => void;
  abortExecution: () => void;
  logs: Array<LogRecord>;
  clearLogs: () => void;
  onContentChange: (value: string) => void;
  envValue: string;
  onEnvValueChange: (value: string) => void;
}) {
  const scriptEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const envEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const consoleRef = useRef<HTMLElement>(null);

  const handleScriptEditorDidMount: MonacoEditorReact.OnMount = useCallback(editor => {
    scriptEditorRef.current = editor;
  }, []);

  const handleEnvEditorDidMount: MonacoEditorReact.OnMount = useCallback(editor => {
    envEditorRef.current = editor;
  }, []);

  const handleMonacoEditorBeforeMount = useCallback((monaco: MonacoEditorReact.Monaco) => {
    // Configure JavaScript defaults for TypeScript validation
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [], // Can specify codes to ignore
    });
    // monaco.languages.typescript.

    // Enable modern JavaScript features and strict checks
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      // noEmit: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      // moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      // module: monaco.languages.typescript.ModuleKind.ESNext,
      lib: [],
      // types: [],
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
    });

    // Add custom typings for globalThis
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
        /// <reference lib="es2020" />

        ${labApiDefinitionRaw}
        declare const lab: LabAPI;


        // ------------------------------------------------------------------------------------------------
        // The following declarations are taken from:
        // https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts
        // ------------------------------------------------------------------------------------------------

        /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console) */
        interface Console {
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/assert_static) */
          assert(condition?: boolean, ...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/clear_static) */
          clear(): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/count_static) */
          count(label?: string): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/countReset_static) */
          countReset(label?: string): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/debug_static) */
          debug(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dir_static) */
          dir(item?: any, options?: any): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dirxml_static) */
          dirxml(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/error_static) */
          error(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/group_static) */
          group(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupCollapsed_static) */
          groupCollapsed(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupEnd_static) */
          groupEnd(): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/info_static) */
          info(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log_static) */
          log(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/table_static) */
          table(tabularData?: any, properties?: string[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/time_static) */
          time(label?: string): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeEnd_static) */
          timeEnd(label?: string): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeLog_static) */
          timeLog(label?: string, ...data: any[]): void;
          timeStamp(label?: string): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/trace_static) */
          trace(...data: any[]): void;
          /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/warn_static) */
          warn(...data: any[]): void;
        }
        declare const console: Console;

        /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setTimeout) */
        declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;

        type TimerHandler = string | Function;
      `,
      'global.d.ts',
    );
  }, []);

  const handleSubmit = useCallback(() => {
    onContentChange(scriptEditorRef.current?.getValue() ?? '');
    onEnvValueChange(envEditorRef.current?.getValue() ?? '');
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

                  execute(scriptEditorRef.current?.getValue() ?? '');
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
              value={content}
              beforeMount={handleMonacoEditorBeforeMount}
              onMount={handleScriptEditorDidMount}
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
              value={envValue}
              onChange={value => onEnvValueChange(value ?? '')}
              onMount={handleEnvEditorDidMount}
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
            onClick={handleSubmit}
            data-cy="preflight-modal-submit"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
