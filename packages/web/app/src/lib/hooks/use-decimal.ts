export function toDecimal(value: number, places = 2) {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

  return formatter.format(value);
}
