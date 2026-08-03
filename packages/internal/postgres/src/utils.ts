import { psql } from './psql';

export function toDate(date: Date) {
  return psql`to_timestamp(${date.getTime() / 1000})`;
}
