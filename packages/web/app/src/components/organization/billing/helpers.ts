export const CurrencyFormatter = Intl.NumberFormat('en', {
  notation: 'standard',
  currency: 'USD',
  style: 'currency',
});

export const DateFormatter = Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** Format millions of operations as "500M" or "2.5B" */
export function formatOperations(millions: number): string {
  if (millions >= 1000) {
    const b = parseFloat((millions / 1000).toFixed(3));
    return `${b}B`;
  }
  return `${millions}M`;
}
