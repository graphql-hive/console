// @vitest-environment jsdom
import { laboratoryStorage } from './laboratory-storage';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('laboratoryStorage', () => {
  it('keeps each target to its own values', () => {
    laboratoryStorage('target-a').set('env', { variables: { token: 'a' } });

    expect(laboratoryStorage('target-a').get('env', null)).toEqual({ variables: { token: 'a' } });
    expect(laboratoryStorage('target-b').get('env', null)).toBeNull();
    expect(laboratoryStorage('target-b').has('env')).toBe(false);
  });

  it('files values under the target id', () => {
    laboratoryStorage('target-a').set('tabs', []);

    expect(localStorage.getItem('hive:laboratory:target:target-a:tabs')).toBe('[]');
  });

  it('falls back on corrupt JSON', () => {
    localStorage.setItem('hive:laboratory:target:target-a:tabs', '{oops');

    expect(laboratoryStorage('target-a').get('tabs', [])).toEqual([]);
  });

  it('keeps going when the browser refuses a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => laboratoryStorage('target-a').set('tabs', [])).not.toThrow();
  });
});
