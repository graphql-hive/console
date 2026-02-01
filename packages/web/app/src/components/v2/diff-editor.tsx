import { ReactElement, useEffect, useRef, useState } from 'react';
import { parse, print } from 'graphql';
import { editor } from 'monaco-editor';
import { MonacoDiffEditor, MonacoEditor } from '@/components/schema-editor';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrettify } from '@/lib/hooks';
import type { Monaco, MonacoDiffEditor as OriginalMonacoDiffEditor } from '@monaco-editor/react';
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon } from '@radix-ui/react-icons';
import { Spinner } from '../ui/spinner';

export const DiffEditor = (props: {
  before: string | null;
  after: string | null;
  downloadFileName?: string;
  /** Allow editing the after schema. Editable schemas don't allow toggling between diff and no-diff */
  editable?: boolean;
  lineNumbers?: boolean;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  onChange?: (source: string | undefined) => void;
}): ReactElement => {
  const { resolvedTheme } = useTheme();
  const [showDiff, setShowDiff] = useState<boolean>(true);
  const sdlBefore = usePrettify(props.before);
  // runs once on mount then uses internal monaco state to manage
  let sdlAfter = props.after ?? '';
  useEffect(() => {
    try {
      sdlAfter = print(parse(sdlAfter));
    } catch {
      // ignore
    }
  }, []);
  const editorRef = useRef<OriginalMonacoDiffEditor | null>(null);

  function handleEditorDidMount(editor: OriginalMonacoDiffEditor, monaco: Monaco) {
    addKeyBindings(editor, monaco);
    editorRef.current = editor;
    props.onMount?.(editor.getModifiedEditor());

    editor.getModifiedEditor().onDidChangeModelContent(() => {
      if (props.editable) {
        const modified = editor.getModifiedEditor();
        props.onChange?.(modified.getValue());
      }
    });
  }

  function addKeyBindings(editor: OriginalMonacoDiffEditor, monaco: Monaco) {
    editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.UpArrow, () => {
      editorRef.current?.goToDiff('previous');
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd + monaco.KeyCode.DownArrow, () => {
      editorRef.current?.goToDiff('next');
    });
  }

  return (
    <div className="w-full">
      <div className="border-neutral-3 mb-2 flex items-center justify-between border-b px-2 py-1">
        <div className="px-2 font-bold">Diff View</div>
        <div className="ml-auto flex h-[36px] items-center px-2">
          {sdlAfter && props.downloadFileName && (
            <DownloadButton fileName={props.downloadFileName} contents={sdlAfter} />
          )}
          {showDiff && (
            <>
              <div className="mr-2 text-xs font-normal">Navigate changes </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => editorRef.current?.goToDiff('previous')}
                    >
                      <ArrowUpIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous change</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => editorRef.current?.goToDiff('next')}
                    >
                      <ArrowDownIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next change</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          {props.editable ? null : (
            <div className="ml-2 flex items-center space-x-2">
              <Label htmlFor="toggle-diff-mode" className="text-xs font-normal">
                Toggle Diff
              </Label>
              <Switch
                id="toggle-diff-mode"
                checked={showDiff}
                onCheckedChange={isChecked => setShowDiff(isChecked)}
              />
            </div>
          )}
        </div>
      </div>
      {showDiff ? (
        <MonacoDiffEditor
          // this outputs either "vs-light" or "vs-dark"
          theme={`vs-${resolvedTheme}`}
          width="100%"
          height="70vh"
          language="graphql"
          loading={<Spinner />}
          original={sdlBefore ?? undefined}
          modified={sdlAfter ?? undefined}
          options={{
            originalEditable: false,
            renderLineHighlightOnlyWhenFocus: true,
            readOnly: !props.editable,
            diffAlgorithm: 'advanced',
            lineNumbers: props.lineNumbers ? undefined : 'off',
          }}
          onMount={handleEditorDidMount}
        />
      ) : (
        <MonacoEditor
          // this outputs either "vs-light" or "vs-dark"
          theme={`vs-${resolvedTheme}`}
          width="100%"
          height="70vh"
          language="graphql"
          loading={<Spinner />}
          value={sdlAfter ?? undefined}
          onMount={props.onMount}
          onChange={props.onChange}
          options={{
            renderLineHighlightOnlyWhenFocus: true,
            readOnly: !props.editable,
            lineNumbers: props.lineNumbers ? undefined : 'off',
            minimap: {
              enabled: false,
            },
            folding: false,
          }}
        />
      )}
    </div>
  );
};

function DownloadButton(props: { contents: string; fileName: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const element = document.createElement('a');
              element.setAttribute(
                'href',
                'data:text/plain;charset=utf-8, ' + encodeURIComponent(props.contents),
              );
              element.setAttribute('download', props.fileName);
              document.body.appendChild(element);
              element.click();

              document.body.removeChild(element);
            }}
            className="mr-2 text-xs font-normal"
          >
            <DownloadIcon className="mr-2" /> Download
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download {props.fileName}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
