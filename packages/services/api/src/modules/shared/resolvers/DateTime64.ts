/**
 * @source https://github.com/graphql-hive/graphql-scalars/blob/8f02889d6fb9d391f86fa761ced271c9bb8d5d6f/src/scalars/iso-date/DateTime.ts#L1
 *
 * Most of this code originates from there. The only modifications is to not instantiate a JS DateTime but keep the value as a string in order to retain
 * nano second precission.
 */
import { GraphQLScalarType, Kind } from 'graphql';
import { createGraphQLError } from 'graphql-yoga';

const leapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const validateDate = (datestring: string): boolean => {
  const RFC_3339_REGEX = /^(\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01]))$/;

  if (!RFC_3339_REGEX.test(datestring)) {
    return false;
  }

  // Verify the correct number of days for
  // the month contained in the date-string.
  const year = Number(datestring.substr(0, 4));
  const month = Number(datestring.substr(5, 2));
  const day = Number(datestring.substr(8, 2));

  switch (month) {
    case 2: // February
      if ((leapYear(year) && day > 29) || (!leapYear(year) && day > 28)) {
        return false;
      }
      return true;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      if (day > 30) {
        return false;
      }
      break;
  }

  return true;
};

const validateDateTime = (dateTimeString: string): boolean => {
  dateTimeString = dateTimeString?.toUpperCase();
  const RFC_3339_REGEX =
    /^(\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60))(\.\d{1,})?(([Z])|([+|-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;

  // Validate the structure of the date-string
  if (!RFC_3339_REGEX.test(dateTimeString)) {
    return false;
  }
  // Check if it is a correct date using the javascript Date parse() method.
  const time = Date.parse(dateTimeString);
  if (time !== time) {
    return false;
  }
  // Split the date-time-string up into the string-date and time-string part.
  // and check whether these parts are RFC 3339 compliant.
  const index = dateTimeString.indexOf('T');
  const dateString = dateTimeString.substr(0, index);
  const timeString = dateTimeString.substr(index + 1);
  return validateDate(dateString) && validateTime(timeString);
};

const validateTime = (time: string): boolean => {
  time = time?.toUpperCase();
  const TIME_REGEX =
    /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])(\.\d{1,})?(([Z])|([+|-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;
  return TIME_REGEX.test(time);
};

const validateJSDate = (date: Date): boolean => {
  const time = date.getTime();
  return time === time;
};

const parseDateTime = (dateTime: string) => dateTime;

export const DateTime64 = new GraphQLScalarType({
  name: 'DateTime64',
  serialize(value) {
    if (value instanceof Date) {
      if (validateJSDate(value)) {
        return value.toISOString();
      }
      throw createGraphQLError('DateTime cannot represent an invalid Date instance');
    } else if (typeof value === 'string') {
      if (validateDateTime(value)) {
        return parseDateTime(value);
      }
      throw createGraphQLError(`DateTime cannot represent an invalid date-time-string ${value}.`);
    } else if (typeof value === 'number') {
      try {
        return new Date(value).toISOString();
      } catch {
        throw createGraphQLError('DateTime cannot represent an invalid Unix timestamp ' + value);
      }
    } else {
      throw createGraphQLError(
        'DateTime cannot be serialized from a non string, ' +
          'non numeric or non Date type ' +
          JSON.stringify(value),
      );
    }
  },
  parseValue(value) {
    if (value instanceof Date) {
      if (validateJSDate(value)) {
        return value.toISOString();
      }
      throw createGraphQLError('DateTime cannot represent an invalid Date instance');
    }
    if (typeof value === 'string') {
      if (validateDateTime(value)) {
        return parseDateTime(value);
      }
      throw createGraphQLError(`DateTime cannot represent an invalid date-time-string ${value}.`);
    }
    throw createGraphQLError(
      `DateTime cannot represent non string or Date type ${JSON.stringify(value)}`,
    );
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw createGraphQLError(
        `DateTime cannot represent non string or Date type ${'value' in ast && ast.value}`,
        {
          nodes: ast,
        },
      );
    }
    const { value } = ast;
    if (validateDateTime(value)) {
      return parseDateTime(value);
    }
    throw createGraphQLError(
      `DateTime cannot represent an invalid date-time-string ${String(value)}.`,
      { nodes: ast },
    );
  },
});
