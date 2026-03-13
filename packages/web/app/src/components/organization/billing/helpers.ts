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

export function formatMillionOrBillion(num: number) {
  if (num / 1000 > 1) return (num / 1000).toFixed(2) + 'B';
  return num.toFixed(0) + 'M';
}
