import { isSafeRedirectPath, redirectToPathSchema } from './route-utils';

describe('isSafeRedirectPath', () => {
  it.each(['/acme', '/acme/shop/prod?filter=1#top', '/'])(
    'accepts a path on this app: %s',
    path => {
      expect(isSafeRedirectPath(path)).toBe(true);
    },
  );

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'acme',
    '',
  ])('rejects anything that could leave the app: %s', value => {
    expect(isSafeRedirectPath(value)).toBe(false);
  });
});

describe('redirectToPathSchema', () => {
  it('keeps a safe path and sends everything else home', () => {
    expect(redirectToPathSchema.parse('/acme/shop')).toBe('/acme/shop');
    expect(redirectToPathSchema.parse('//evil.example')).toBe('/');
    expect(redirectToPathSchema.parse(undefined)).toBe('/');
  });
});
