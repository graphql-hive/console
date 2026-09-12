import { base, en, Faker } from '@faker-js/faker';

/** A seeded faker so a fixture built with the same options is identical every time. */
export function createFixtureFaker(seed = 1): Faker {
  // base carries locale-independent data (e.g. hacker.abbreviation) that en falls through to.
  const faker = new Faker({ locale: [en, base] });
  faker.seed(seed);
  return faker;
}

/**
 * Reference point for relative dates. faker's date helpers anchor on Date.now() otherwise,
 * which makes two builds a millisecond apart differ. Start of today keeps "2 weeks ago"
 * labels realistic while staying stable across reloads within the day.
 */
export function fixtureNow(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
