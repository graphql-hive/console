// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { DeliveryStatCards } from './delivery-stat-cards';

/** The value under the card titled `title`. */
function valueOf(title: string) {
  const heading = screen.getByRole('heading', { name: title });
  return heading.parentElement!.parentElement!.nextElementSibling!.textContent;
}

const stats = { totalDeliveries: 3, totalFailures: 0 };
const headline = { title: 'Emails sent' };

describe('DeliveryStatCards', () => {
  it('shows - for the last success and failure when the health could not be read', () => {
    render(
      <DeliveryStatCards
        stats={stats}
        health={null}
        windowLabel="the window"
        headline={headline}
      />,
    );

    expect(valueOf('Last success')).toBe('-');
    expect(valueOf('Last failure')).toBe('-');
  });

  it('shows Never when the health was read and nothing was recorded', () => {
    render(
      <DeliveryStatCards
        stats={stats}
        health={{ lastSuccessAt: null, lastFailureAt: null }}
        windowLabel="the window"
        headline={headline}
      />,
    );

    expect(valueOf('Last success')).toBe('Never');
    expect(valueOf('Last failure')).toBe('Never');
  });
});
