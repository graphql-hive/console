import { maskToken } from './helpers';

describe('maskToken', () => {
  test("output for maskToken('') is the same", () => {
    expect(maskToken('')).toEqual('');
  });
  test("output for maskToken('aaa') is the same", () => {
    expect(maskToken('aaa')).toEqual('aaa');
  });
  test("output for maskToken('aaabbbaaa') is masked properly", () => {
    expect(maskToken('aaabbbaaa')).toEqual('aaa***aaa');
  });
});
