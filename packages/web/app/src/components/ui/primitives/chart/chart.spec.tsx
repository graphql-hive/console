// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { Chart } from './chart';

const instance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
const init = vi.fn(() => instance);

vi.mock('echarts', () => ({ init: (...args: unknown[]) => init(...(args as [])) }));

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Chart', () => {
  it('creates one instance and sets the option once on mount', () => {
    const option = { series: [] };
    render(<Chart option={option} height={200} />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(instance.setOption).toHaveBeenCalledTimes(1);
    expect(instance.setOption).toHaveBeenCalledWith(option);
  });

  it('mounts ECharts out of normal flow so its pixel width never widens the page', () => {
    const { container } = render(<Chart option={{}} height={200} />);
    const host = container.firstChild as HTMLElement;
    const mount = (init.mock.calls[0] as unknown[])[0] as HTMLElement;
    expect(host.className).toContain('relative');
    expect(host.style.height).toBe('200px');
    expect(mount.parentElement).toBe(host);
    expect(mount.className).toContain('absolute');
  });

  it('keeps the instance across re-renders and sets only a changed option', () => {
    const option = { series: [] };
    const { rerender } = render(<Chart option={option} height={200} />);
    rerender(<Chart option={option} height={200} />);
    expect(instance.setOption).toHaveBeenCalledTimes(1);

    const next = { series: [{ type: 'line' as const, data: [1] }] };
    rerender(<Chart option={next} height={200} />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(instance.setOption).toHaveBeenCalledTimes(2);
    expect(instance.setOption).toHaveBeenLastCalledWith(next);
  });

  it('binds events and unbinds them with the instance on unmount', () => {
    const click = vi.fn();
    const { unmount } = render(<Chart option={{}} height={200} onEvents={{ click }} />);
    expect(instance.on).toHaveBeenCalledWith('click', click);
    unmount();
    expect(instance.off).toHaveBeenCalledWith('click', click);
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });
});
