// @vitest-environment jsdom
import type * as Urql from 'urql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChannelEnabledToggle } from './channel-enabled-toggle';

/** One stub per mutation, told apart by the document's operation name; each test resets them. */
const urql = vi.hoisted(() => ({
  state: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  enable: vi.fn(),
  disable: vi.fn(),
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useMutation: (document: { definitions: Array<{ name?: { value: string } }> }) => [
    urql.state,
    document.definitions[0]?.name?.value.includes('Disable') ? urql.disable : urql.enable,
  ],
}));

const slugs = { organizationSlug: 'acme', projectSlug: 'shop' };

vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSlugs: () => slugs,
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/primitives/toast/toast', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/ui/primitives/toast/toast')>()),
  useToast: () => ({ toast }),
}));

const flip = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('switch', { name }));
  });

beforeEach(() => {
  urql.enable.mockReset();
  urql.disable.mockReset();
  toast.mockReset();
});

describe('ChannelEnabledToggle', () => {
  it('disables an enabled channel and enables a disabled one', async () => {
    urql.disable.mockResolvedValue({ data: { disableAlertChannel: { ok: {}, error: null } } });
    urql.enable.mockResolvedValue({ data: { enableAlertChannel: { ok: {}, error: null } } });
    const { rerender } = render(<ChannelEnabledToggle channelId="c1" enabled />);

    await flip('Disable channel');
    expect(urql.disable).toHaveBeenCalledWith({ input: { ...slugs, channelId: 'c1' } });
    expect(urql.enable).not.toHaveBeenCalled();

    rerender(<ChannelEnabledToggle channelId="c1" enabled={false} />);
    await flip('Enable channel');
    expect(urql.enable).toHaveBeenCalledWith({ input: { ...slugs, channelId: 'c1' } });
    expect(toast).not.toHaveBeenCalled();
  });

  it('reports a refusal', async () => {
    urql.disable.mockResolvedValue({
      data: {
        disableAlertChannel: {
          ok: null,
          error: { message: 'Alert channel not found or already disabled.' },
        },
      },
    });
    render(<ChannelEnabledToggle channelId="c1" enabled />);

    await flip('Disable channel');

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Disable channel failed.',
      description: 'Alert channel not found or already disabled.',
    });
  });
});
