export function scrubBasicAuth(value: string) {
  return value.replace(/\bhttps?:\/\/([^:@\/]+):([^@\/]+)@/gi, 'https://[Filtered]:[Filtered]@');
}
