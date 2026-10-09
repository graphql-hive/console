// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

function renderSplit(orientation?: 'horizontal' | 'vertical') {
  return render(
    <ResizablePanelGroup orientation={orientation}>
      <ResizablePanel defaultSize="70%">top</ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="30%">bottom</ResizablePanel>
    </ResizablePanelGroup>,
  );
}

describe('Resizable', () => {
  it('renders an accessible separator between the panels', () => {
    renderSplit();
    const separator = screen.getByRole('separator');
    expect(separator.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('top')).toBeTruthy();
    expect(screen.getByText('bottom')).toBeTruthy();
  });

  it('shares the vertical orientation with the handle for its styles', () => {
    const { container } = renderSplit('vertical');
    expect(container.querySelector('[data-group]')?.getAttribute('data-orientation')).toBe(
      'vertical',
    );
    expect(screen.getByRole('separator').getAttribute('data-orientation')).toBe('vertical');
  });

  it('defaults to horizontal', () => {
    renderSplit();
    expect(screen.getByRole('separator').getAttribute('data-orientation')).toBe('horizontal');
  });
});
