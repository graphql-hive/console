export const NumericFormater = Intl.NumberFormat('en', { notation: 'compact' });
export const CurrencyFormatter = Intl.NumberFormat('en', {
  notation: 'standard',
  currency: 'USD',
  style: 'currency',
});
