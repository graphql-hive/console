// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import {
  runIsolatedLabScript,
  usePreflight,
  usePreflightPrompt,
  type LaboratoryPreflightPromptRequest,
} from './preflight';

/** The real worker never runs under happy-dom, so the tests drive its message protocol. */
class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  posted: any[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(data: any) {
    this.posted.push(data);
  }

  terminate() {}

  emit(data: any) {
    this.onmessage?.({ data });
  }
}

const lastWorker = () => FakeWorker.instances[FakeWorker.instances.length - 1];

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
  URL.createObjectURL = vi.fn(() => 'blob:preflight-spec');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runIsolatedLabScript', () => {
  it('answers a prompt with the value from the handler', async () => {
    const prompt = vi.fn().mockResolvedValue('dog');

    void runIsolatedLabScript('await lab.prompt("Noun")', { variables: {} }, prompt);

    lastWorker().emit({ type: 'prompt', title: 'Noun', defaultValue: undefined, options: {} });

    await vi.waitFor(() => {
      expect(lastWorker().posted).toContainEqual({ type: 'prompt:result', value: 'dog' });
    });
    expect(prompt).toHaveBeenCalledWith('Noun', undefined, {});
  });

  it('passes the prompt metadata through to the handler', async () => {
    const prompt = vi.fn().mockResolvedValue('hv_123');

    void runIsolatedLabScript('await lab.prompt("API token")', { variables: {} }, prompt);

    lastWorker().emit({
      type: 'prompt',
      title: 'API token',
      defaultValue: 'hv_',
      options: { placeholder: 'hv_...', description: 'Used for this request only' },
    });

    await vi.waitFor(() => {
      expect(prompt).toHaveBeenCalledWith('API token', 'hv_', {
        placeholder: 'hv_...',
        description: 'Used for this request only',
      });
    });
  });

  it('answers with null when the handler rejects', async () => {
    const prompt = vi.fn().mockRejectedValue(new Error('modal blew up'));

    void runIsolatedLabScript('await lab.prompt("Noun")', { variables: {} }, prompt);

    lastWorker().emit({ type: 'prompt', title: 'Noun', defaultValue: undefined, options: {} });

    await vi.waitFor(() => {
      expect(lastWorker().posted).toContainEqual({ type: 'prompt:result', value: null });
    });
  });

  // Without a reply the script awaits `lab.prompt()` forever and the run never resolves.
  it('answers with null when no handler is supplied', async () => {
    void runIsolatedLabScript('await lab.prompt("Noun")', { variables: {} });

    lastWorker().emit({ type: 'prompt', title: 'Noun', defaultValue: undefined, options: {} });

    await vi.waitFor(() => {
      expect(lastWorker().posted).toContainEqual({ type: 'prompt:result', value: null });
    });
  });
});

describe('usePreflightPrompt', () => {
  // The dialog opens on a timer, so the tests drive it rather than waiting on it.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the modal with the requested prompt', () => {
    const { result } = renderHook(() => usePreflightPrompt());

    act(() => {
      result.current.openPreflightPromptModal({
        title: 'Noun',
        defaultValue: 'dog',
        placeholder: 'e.g. cat',
        description: 'Any noun will do',
      });
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isPreflightPromptModalOpen).toBe(true);
    expect(result.current.preflightPromptModalProps).toMatchObject({
      title: 'Noun',
      defaultValue: 'dog',
      placeholder: 'e.g. cat',
      description: 'Any noun will do',
    });
  });

  it('answers each request once', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => usePreflightPrompt());

    act(() => {
      result.current.openPreflightPromptModal({ title: 'Noun', onSubmit });
    });

    act(() => {
      result.current.preflightPromptModalProps.onSubmit?.('dog');
      result.current.preflightPromptModalProps.onSubmit?.(null);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('dog');
  });

  // Runs overlap: an operation run can prompt while schema polling already has one open.
  // Only one request fits on screen, so the displaced one has to be released.
  it('answers a displaced request with null instead of leaving it waiting', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => usePreflightPrompt());

    act(() => {
      result.current.openPreflightPromptModal({ title: 'Noun', onSubmit: first });
      result.current.openPreflightPromptModal({ title: 'Verb', onSubmit: second });
    });

    expect(first).toHaveBeenCalledWith(null);
    expect(result.current.preflightPromptModalProps.title).toBe('Verb');

    act(() => {
      result.current.preflightPromptModalProps.onSubmit?.('run');
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('run');
  });
});

describe('usePreflight', () => {
  const mountPreflight = (
    openPreflightPromptModal?: (request: LaboratoryPreflightPromptRequest) => void,
  ) =>
    renderHook(() =>
      usePreflight({
        defaultPreflight: { enabled: true, script: 'await lab.prompt("Noun")' },
        envApi: { env: { variables: {} }, setEnv: vi.fn() },
        openPreflightPromptModal,
      }),
    );

  // Running an operation goes through `runPreflight`, which used to pass no prompt handler at
  // all, so a script prompting there hung instead of opening the modal.
  it('opens the prompt modal and returns the submitted value', async () => {
    const openPreflightPromptModal = vi.fn();
    const { result } = mountPreflight(openPreflightPromptModal);

    let run: Promise<unknown> | undefined;
    act(() => {
      run = result.current.runPreflight();
    });

    lastWorker().emit({ type: 'prompt', title: 'Noun', defaultValue: undefined, options: {} });

    await vi.waitFor(() => {
      expect(openPreflightPromptModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Noun' }),
      );
    });

    openPreflightPromptModal.mock.lastCall?.[0].onSubmit('dog');

    await vi.waitFor(() => {
      expect(lastWorker().posted).toContainEqual({ type: 'prompt:result', value: 'dog' });
    });

    lastWorker().emit({ type: 'result', env: { variables: {} }, headers: {}, pluginsState: {} });

    await expect(run).resolves.toMatchObject({ status: 'success' });
  });

  it('answers with null when the host wires no prompt modal', async () => {
    const { result } = mountPreflight();

    act(() => {
      void result.current.runPreflight();
    });

    lastWorker().emit({ type: 'prompt', title: 'Noun', defaultValue: undefined, options: {} });

    await vi.waitFor(() => {
      expect(lastWorker().posted).toContainEqual({ type: 'prompt:result', value: null });
    });
  });
});
