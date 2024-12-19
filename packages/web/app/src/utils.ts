import { ENTERPRISE_RETENTION_DAYS, HOBBY_RETENTION_DAYS, PRO_RETENTION_DAYS } from './constants';

type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T; // from lodash

export function truthy<T>(value: T): value is Truthy<T> {
  return !!value;
}

const darkChartStyles = {
  backgroundColor: 'transparent',
  textStyle: { color: '#fff' },
  legend: {
    textStyle: { color: '#fff' },
  },
};

export function useChartStyles() {
  return darkChartStyles;
  // TODO: fix it when Hive will have white theme
  // useColorModeValue(
  //   {
  //     backgroundColor: '#fff',
  //     textStyle: { color: '#52525b' },
  //     legend: {
  //       textStyle: { color: '#52525b' },
  //     },
  //   },
  // );
}

export function resolveRetentionInDaysBasedOrganizationPlan(
  value: number | null | undefined,
): number {
  if (value == null) {
    return HOBBY_RETENTION_DAYS;
  }

  if (value < HOBBY_RETENTION_DAYS) {
    return HOBBY_RETENTION_DAYS;
  }

  if (value > HOBBY_RETENTION_DAYS && value <= PRO_RETENTION_DAYS) {
    return PRO_RETENTION_DAYS;
  }

  if (value > PRO_RETENTION_DAYS) {
    return ENTERPRISE_RETENTION_DAYS;
  }

  return HOBBY_RETENTION_DAYS;
}
