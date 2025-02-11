import { clsx } from 'clsx';
import { PowerIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Subtitle } from '@/components/ui/page';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { useToggle } from '@/lib/hooks';
import { GraphiQLPlugin } from '@graphiql/react';
import { Pencil1Icon } from '@radix-ui/react-icons';
import { useParams } from '@tanstack/react-router';
import { cn } from '../utils';
import { EditorTitle } from './components/EditorTitle';
import { EnvironmentEditor } from './components/EnvironmentEditor';
import { PreflightModal, PreflightModalEditorValue } from './components/PreflightModal';
import { ScriptEditor } from './components/ScriptEditor';
import { usePreflightContext } from './hooks/usePreflightContext';

const classes = {
  monacoMini: clsx('h-32 *:rounded-md *:bg-[#10151f]'),
};

export const preflightPlugin: GraphiQLPlugin = {
  icon: () => (
    <svg
      viewBox="0 0 256 256"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    >
      <path d="M136 160h40" />
      <path d="m80 96 40 32-40 32" />
      <rect width="192" height="160" x="32" y="48" rx="8.5" />
    </svg>
  ),
  title: 'Preflight Script',
  content,
};

const UpdatePreflightScriptMutation = graphql(`
  mutation UpdatePreflightScript($input: UpdatePreflightScriptInput!) {
    updatePreflightScript(input: $input) {
      ok {
        updatedTarget {
          id
          preflightScript {
            id
            sourceCode
          }
        }
      }
      error {
        message
      }
    }
  }
`);

function content() {
  const { toast } = useToast();
  const [showModal, toggleShowModal] = useToggle();
  const preflight = usePreflightContext();
  const params = useParams({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug',
  });
  const [, mutate] = useMutation(UpdatePreflightScriptMutation);

  const onPreflightEditorSave = async (value: PreflightModalEditorValue) => {
    preflight.setEnvironmentVariables(value.environmentVariables);

    const { data, error } = await mutate({
      input: {
        selector: params,
        sourceCode: value.script,
      },
    });
    const err = error || data?.updatePreflightScript?.error;

    if (err) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Update',
      description: 'Preflight script has been updated successfully',
      variant: 'default',
    });
  };

  return (
    <>
      <PreflightModal
        // to unmount on submit/close
        key={String(showModal)}
        isOpen={showModal}
        toggle={toggleShowModal}
        execute={value =>
          preflight.execute(value, true).catch(err => {
            console.error(err);
          })
        }
        state={preflight.state}
        abortExecution={preflight.abortExecution}
        logs={preflight.logs}
        clearLogs={preflight.clearLogs}
        value={{
          script: preflight.script,
          environmentVariables: preflight.environmentVariables,
        }}
        onSubmit={onPreflightEditorSave}
      />
      <div className="graphiql-doc-explorer-title flex items-center justify-between gap-4">
        Preflight Script
        <Button
          variant="orangeLink"
          size="icon-sm"
          className="size-auto gap-1"
          onClick={toggleShowModal}
          data-cy="preflight-modal-button"
        >
          <Pencil1Icon className="shrink-0" />
          Edit
        </Button>
      </div>
      <Subtitle>
        Before each GraphQL request begins, this script is executed automatically - for example, to
        handle authentication.
      </Subtitle>

      <div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => preflight.setIsEnabled(!preflight.isEnabled)}
          data-cy="toggle-preflight"
        >
          <PowerIcon className="mr-2 size-4" />
          {preflight.isEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <EditorTitle className="mt-6 flex cursor-not-allowed items-center gap-2">
        Script{' '}
        <Badge className="text-xs" variant="outline">
          JavaScript
        </Badge>
      </EditorTitle>
      <Subtitle className="mb-3 cursor-not-allowed">Read-only view of the script</Subtitle>
      <div className="relative">
        {preflight.isEnabled ? null : (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#030711]/90 p-4 text-white">
            <div className="rounded-md bg-[#0f1520] p-4 text-sm">
              Preflight Script is disabled and will not be executed
            </div>
          </div>
        )}
        <ScriptEditor
          height={128}
          value={preflight.script}
          className={cn(classes.monacoMini, 'z-10')}
          wrapperProps={{
            ['data-cy']: 'preflight-editor-mini',
          }}
          options={{
            lineNumbers: 'off',
            domReadOnly: true,
            readOnly: true,
            hover: {
              enabled: false,
            },
          }}
        />
      </div>

      <EditorTitle className="mt-6 flex items-center gap-2">
        Environment variables{' '}
        <Badge className="text-xs" variant="outline">
          JSON
        </Badge>
      </EditorTitle>
      <Subtitle className="mb-3">
        Declare variables that can be used by both the script and headers.
      </Subtitle>
      <EnvironmentEditor
        height={128}
        value={preflight.environmentVariables}
        onChange={value => preflight.setEnvironmentVariables(value ?? '')}
        className={classes.monacoMini}
        wrapperProps={{
          ['data-cy']: 'env-editor-mini',
        }}
      />
    </>
  );
}
