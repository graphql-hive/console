import { TARGET_ROUTE_PREFIX as P, resolveTargetSwitchTo } from './target-selector.utils';

// A representative slice of the registered route fullPaths (see router.tsx). `resolveTargetSwitchTo`
// only cares whether a candidate section path exists here, so non-target routes are irrelevant.
const ALL_ROUTES = [
  '/',
  '/$organizationSlug',
  P,
  `${P}/`, // index route
  `${P}/history`,
  `${P}/history/$versionId`,
  `${P}/explorer`,
  `${P}/explorer/$typename`,
  `${P}/insights`,
  `${P}/insights/manage-filters`,
  `${P}/insights/$operationName/$operationHash`,
  `${P}/traces`,
  `${P}/trace/$traceId`,
  `${P}/apps`,
  `${P}/apps/$appName/$appVersion`,
  `${P}/alerts`,
  `${P}/alerts/$ruleId`,
];

// matched routes are ordered root -> leaf; the pathless authenticated layout has no fullPath.
const resolve = (...matched: Array<string | undefined>) =>
  resolveTargetSwitchTo(matched, ALL_ROUTES);

describe('resolveTargetSwitchTo', () => {
  it('drops a nested detail id and returns the section parent (history)', () => {
    expect(resolve(undefined, P, `${P}/history`, `${P}/history/$versionId`)).toBe(`${P}/history`);
  });

  it('drops a nested detail id and returns the section parent (alerts)', () => {
    expect(resolve(P, `${P}/alerts`, `${P}/alerts/$ruleId`)).toBe(`${P}/alerts`);
  });

  it('keeps a clean section page unchanged', () => {
    expect(resolve(P, `${P}/insights`)).toBe(`${P}/insights`);
  });

  it('keeps a clean multi-segment page unchanged', () => {
    expect(resolve(P, `${P}/insights/manage-filters`)).toBe(`${P}/insights/manage-filters`);
  });

  it('recovers the section for a flat detail route (explorer)', () => {
    expect(resolve(P, `${P}/explorer/$typename`)).toBe(`${P}/explorer`);
  });

  it('recovers the section for a flat detail route with two ids (insights operation)', () => {
    expect(resolve(P, `${P}/insights/$operationName/$operationHash`)).toBe(`${P}/insights`);
  });

  it('falls back to target home when the flat section is not a known route (trace)', () => {
    expect(resolve(P, `${P}/trace/$traceId`)).toBe(P);
  });

  it('strips the trailing slash of the target index route', () => {
    expect(resolve(P, `${P}/`)).toBe(P);
  });

  it('returns the target home when nothing under the target matches', () => {
    expect(resolve(undefined, '/', '/$organizationSlug')).toBe(P);
  });
});
