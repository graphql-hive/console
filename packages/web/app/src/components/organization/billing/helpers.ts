export const CurrencyFormatter = Intl.NumberFormat('en', {
  notation: 'standard',
  currency: 'USD',
  style: 'currency',
});

export function formatMillionOrBillion(num: number) {
  if (num >= 1000) return parseFloat((num / 1000).toFixed(3)) + 'B';
  return num.toFixed(0) + 'M';
}
