import { createFallbackQueue } from '../src/fallback-queue';

function waitFor(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const logger = {
  info: vi.fn(),
  error: vi.fn(),
};

test('add() drops the oldest message and calls onQueueFull once the queue is full', () => {
  const onQueueFull = vi.fn();
  const queue = createFallbackQueue({
    send: vi.fn().mockResolvedValue(undefined),
    onTooLarge: vi.fn(),
    onQueueFull,
    logger,
  });

  for (let i = 0; i < 1000; i++) {
    queue.add(Buffer.from(`msg-${i}`), i + 1);
  }
  expect(queue.size()).toEqual(1000);
  expect(onQueueFull).not.toHaveBeenCalled();

  // The 1001st message overflows the queue - the oldest (numOfOperations = 1) is
  // dropped to make room.
  queue.add(Buffer.from('msg-overflow'), 999);

  expect(queue.size()).toEqual(1000);
  expect(onQueueFull).toHaveBeenCalledTimes(1);
  expect(onQueueFull).toHaveBeenCalledWith(1);
});

test('flushSingle drops the message and calls onTooLarge on MESSAGE_TOO_LARGE, without requeuing it', async () => {
  const tooLargeError = Object.assign(new Error('too large'), { type: 'MESSAGE_TOO_LARGE' });
  const send = vi.fn().mockRejectedValue(tooLargeError);
  const onTooLarge = vi.fn();
  const onQueueFull = vi.fn();
  const queue = createFallbackQueue({ send, onTooLarge, onQueueFull, logger });

  queue.add(Buffer.from('too-big'), 42);
  queue.start();
  await waitFor(250);

  expect(send).toHaveBeenCalledTimes(1);
  expect(onTooLarge).toHaveBeenCalledWith(42);
  expect(onQueueFull).not.toHaveBeenCalled();
  expect(queue.size()).toEqual(0);

  // The queue is already empty here - stop()'s drain must not call send() again.
  await queue.stop();
  expect(send).toHaveBeenCalledTimes(1);
});

test('flushSingle requeues the message on a transient failure without calling onTooLarge or onQueueFull', async () => {
  const send = vi.fn().mockRejectedValue(new Error('network blip'));
  const onTooLarge = vi.fn();
  const onQueueFull = vi.fn();
  const queue = createFallbackQueue({ send, onTooLarge, onQueueFull, logger });

  queue.add(Buffer.from('retry-me'), 7);
  queue.start();
  await waitFor(250);

  // Assert before stop() - stop() drains whatever's still queued through the same
  // `send`, which would add another call now that the message has been requeued.
  expect(send).toHaveBeenCalledTimes(1);
  expect(onTooLarge).not.toHaveBeenCalled();
  expect(onQueueFull).not.toHaveBeenCalled();
  expect(queue.size()).toEqual(1);

  await queue.stop();
});

test('flushSingle sends the oldest message and removes it from the queue on success', async () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const queue = createFallbackQueue({ send, onTooLarge: vi.fn(), onQueueFull: vi.fn(), logger });

  queue.add(Buffer.from('ok'), 3);
  queue.start();
  await waitFor(250);

  expect(send).toHaveBeenCalledWith(Buffer.from('ok'), 3);
  expect(queue.size()).toEqual(0);

  // The queue is already empty here - stop()'s drain must not call send() again.
  await queue.stop();
  expect(send).toHaveBeenCalledTimes(1);
});
