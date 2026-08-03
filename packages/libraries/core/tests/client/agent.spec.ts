import { createHiveTestingLogger } from 'test-utils.js';
import { createAgent } from '../../src/client/agent.js';

describe('createAgent', () => {
  it('should gracefully handle and log rejected promises passed to capture()', async () => {
    const mockLogger = createHiveTestingLogger();
    const unhandledRejectionSpy = vi.fn();
    process.on('unhandledRejection', unhandledRejectionSpy);

    let d = new Set();
    const data = {
      clear: () => d.clear(),
      set: (v: unknown) => d.add(v),
      size: () => d.size,
    };

    const agent = createAgent(
      {
        endpoint: 'http://localhost/test',
        token: 'test-token',
        logger: mockLogger as any,
      },
      {
        data,
        body: () => 'test-body',
      },
    );

    const err = new Error('Testing');
    const rejectedPromise = Promise.reject(err);

    agent.capture(rejectedPromise);
    await expect(agent.dispose()).resolves.not.toThrow(); // wait for the capture to be resolved/rejected
    expect(mockLogger.getLogs()).toEqual(
      expect.stringContaining('[ERR] Failed to capture async event (error={})'),
    );
    process.off('unhandledRejection', unhandledRejectionSpy);
    expect(unhandledRejectionSpy).not.toHaveBeenCalled();
    expect(data.size()).toBe(0);
  });
});
