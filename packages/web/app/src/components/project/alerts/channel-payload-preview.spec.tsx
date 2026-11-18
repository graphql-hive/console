// @vitest-environment jsdom
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChannelPayloadPreview } from './channel-payload-preview';

function renderPreview() {
  return render(
    <ToastProvider>
      <ChannelPayloadPreview />
    </ToastProvider>,
  );
}

const payloadType = () => screen.getByRole('combobox', { name: /Payload type/ });
const shownPayload = (container: HTMLElement) =>
  JSON.parse(container.querySelector('pre')?.textContent ?? 'null');

/** Base UI commits an option on mouse-up once its guard against the opening click has passed. */
async function pickPayloadType(name: string) {
  await act(async () => {
    fireEvent.click(payloadType());
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
  });
  const option = screen.getByRole('option', { name });
  await act(async () => {
    fireEvent.mouseMove(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option);
  });
}

describe('ChannelPayloadPreview', () => {
  it('shows the first payload once expanded, and the chosen one after picking another type', async () => {
    const { container } = renderPreview();

    expect(container.querySelector('pre')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payload preview' }));
    });

    expect(payloadType().textContent).toContain('Schema change');
    expect(shownPayload(container)).toMatchObject({ schema: { valid: true } });

    await pickPayloadType('Metric alert (firing)');

    expect(payloadType().textContent).toContain('Metric alert (firing)');
    expect(shownPayload(container)).toMatchObject({ type: 'metric_alert', state: 'firing' });
  });
});
