import { FederatedLinkUrl } from '../link-url';

describe('FederatedLinkUrl', () => {
  test.each([
    [
      'https://spec.example.com/a/b/mySchema/v1.0/',
      'https://spec.example.com/a/b/mySchema',
      'mySchema',
      'v1.0',
    ],
    ['https://spec.example.com', 'https://spec.example.com', null, null],
    [
      'https://spec.example.com/mySchema/v0.1?q=v#frag',
      'https://spec.example.com/mySchema',
      'mySchema',
      'v0.1',
    ],
    ['https://spec.example.com/v1.0', 'https://spec.example.com', null, 'v1.0'],
    ['https://spec.example.com/vX', 'https://spec.example.com/vX', 'vX', null],
  ])('fromUrl correctly parses the identity, name, and version', (url, identity, name, version) => {
    const spec = FederatedLinkUrl.fromUrl(url);
    expect(spec.identity).toBe(identity);
    expect(spec.name).toBe(name);
    expect(spec.version).toBe(version);
  });

  test.each([
    ['https://spec.example.com/a/b/mySchema/v1.2/', 'https://spec.example.com/a/b/mySchema/v1.0/'],
    ['https://spec.example.com', 'https://spec.example.com'],
    ['https://spec.example.com/mySchema/v0.1?q=v#frag', 'https://spec.example.com/mySchema/v0.1'],
    ['https://spec.example.com/v1.100', 'https://spec.example.com/v1.0'],
    ['https://spec.example.com/vX', 'https://spec.example.com/vX'],
  ])(
    'supports returns true for specs with the same identity and compatible versions',
    (url0, url1) => {
      expect(FederatedLinkUrl.fromUrl(url0).supports(FederatedLinkUrl.fromUrl(url1))).toBe(true);
    },
  );

  test.each([
    ['https://spec.example.com/a/b/mySchema/v1.0/', 'https://spec.example.com/a/b/mySchema/v1.2/'],
    ['https://spec.example.com/mySchema/v0.1?q=v#frag', 'https://spec.example.com/mySchema/v0.2'],
    ['https://spec.example.com/v1.0', 'https://spec.example.com/v1.100'],
  ])(
    'supports returns false for specs with the same identity and incompatible versions',
    (url0, url1) => {
      expect(FederatedLinkUrl.fromUrl(url0).supports(FederatedLinkUrl.fromUrl(url1))).toBe(false);
    },
  );

  test.each([
    ['https://spec.example.com/a/b/mySchema/v1.0/', 'https://spec.example.com/a/b/mySchema/v1.0'],
    ['https://spec.example.com', 'https://spec.example.com'],
    ['https://spec.example.com/mySchema/v0.1?q=v#frag', 'https://spec.example.com/mySchema/v0.1'],
    ['https://spec.example.com/v1.0', 'https://spec.example.com/v1.0'],
    ['https://spec.example.com/vX', 'https://spec.example.com/vX'],
  ])('toString returns the normalized url', (url, str) => {
    expect(FederatedLinkUrl.fromUrl(url).toString()).toBe(str);
  });
});
