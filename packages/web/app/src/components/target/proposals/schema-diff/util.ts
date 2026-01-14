import { astFromValue, GraphQLArgument, print } from 'graphql';

export function determineChangeType<T>(oldType: T | null, newType: T | null) {
  if (oldType && !newType) {
    return 'removal' as const;
  }
  if (newType && !oldType) {
    return 'addition' as const;
  }
  return 'mutual' as const;
}

export function lineToWordChange(changeType: 'removal' | 'addition' | 'no change' | 'mutual') {
  return changeType === 'mutual' ? 'no change' : changeType;
}

export function printDefault(arg: GraphQLArgument) {
  const defaultAST = astFromValue(arg.defaultValue, arg.type);
  return defaultAST && print(defaultAST);
}
