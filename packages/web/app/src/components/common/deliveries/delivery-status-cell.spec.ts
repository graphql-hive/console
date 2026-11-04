import { statusPopover } from './delivery-status-cell';

describe('statusPopover', () => {
  it('offers the full status only when it is too long for the column', () => {
    expect(statusPopover('404 Not Found')).toBeUndefined();
    expect(statusPopover('431 Request Header Fields Too Large')).toBe(
      '431 Request Header Fields Too Large',
    );
    expect(statusPopover("ETIMEDOUT: Timeout awaiting 'request' for 10000ms")).toBe(
      "ETIMEDOUT: Timeout awaiting 'request' for 10000ms",
    );
  });
});
