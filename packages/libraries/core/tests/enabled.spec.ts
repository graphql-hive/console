import { createHive } from '../src/client/client.js';

test("should log that it's not enabled", async () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
  };

  const hive = createHive({
    enabled: false,
    debug: true,
    agent: {
      logger,
    },
    token: '',
  });

  const result = await Promise.resolve(hive.info())
    .then(() => 'OK')
    .catch(() => 'ERROR');

  expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`[hive] is not enabled.`));
  expect(result).toBe('OK');
});

test("should not log that it's not enabled", async () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
  };

  const hive = createHive({
    enabled: false,
    debug: false,
    agent: { logger },
  });

  expect(logger.info).not.toBeCalled();
  expect(hive.info()).toBeUndefined();
});

test('should not throw exception about missing token when disabled', async () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
  };

  const hive = createHive({
    enabled: false,
    debug: false,
    agent: { logger },
  });

  expect(logger.info).not.toBeCalled();
  expect(hive.info()).toBeUndefined();
});
