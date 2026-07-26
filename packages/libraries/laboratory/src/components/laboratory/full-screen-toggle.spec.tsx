// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { FullScreenToggle } from './tabs';

describe('FullScreenToggle', () => {
  it('renders nothing when the host already fills the viewport', () => {
    const { container } = render(
      <FullScreenToggle enabled={false} isFullScreen={false} onEnter={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('enters full screen', () => {
    const onEnter = vi.fn();
    render(<FullScreenToggle enabled isFullScreen={false} onEnter={onEnter} />);

    fireEvent.click(screen.getByLabelText('Go to full screen'));

    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('exits full screen', () => {
    const onExit = vi.fn();
    render(<FullScreenToggle enabled isFullScreen onExit={onExit} />);

    fireEvent.click(screen.getByLabelText('Exit full screen'));

    expect(onExit).toHaveBeenCalledOnce();
  });
});
