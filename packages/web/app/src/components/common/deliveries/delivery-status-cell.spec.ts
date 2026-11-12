import { statusPopover } from './delivery-status-cell';

describe('statusPopover', () => {
  it('offers the full status only when it is too long for the column', () => {
    expect(statusPopover('404 Not Found')).toBeUndefined();
    expect(statusPopover('431 Request Header Fields Too Large')).toBe(
      '431 Request Header Fields Too Large',
    );
    expect(
      statusPopover(
        '422 You tried to send to a recipient that has been marked as inactive. (error code 406)',
      ),
    ).toBe(
      '422 You tried to send to a recipient that has been marked as inactive. (error code 406)',
    );
  });
});
