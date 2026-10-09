import { parentPort } from 'node:worker_threads';

// The `raw` field of the first schema is interpreted as a command.
const okResult = {
  errors: [],
  sdl: 'ok',
  supergraph: null,
  contracts: null,
  tags: null,
  schemaMetadata: null,
  metadataAttributes: null,
};

parentPort.on('message', message => {
  const command = message.data.args.schemas[0].raw;
  const reply = () =>
    parentPort.postMessage({
      event: 'compositionResult',
      id: message.id,
      data: { type: 'single', result: okResult },
    });

  if (command === 'ok') {
    reply();
  } else if (command.startsWith('sleep:')) {
    setTimeout(reply, Number(command.slice('sleep:'.length)));
  } else if (command === 'error') {
    parentPort.postMessage({ event: 'error', id: message.id, err: new Error('stub error') });
  } else if (command === 'hang') {
  } else if (command === 'exit') {
    process.exit(3);
  } else if (command === 'crash') {
    setImmediate(() => {
      throw new Error('stub crash');
    });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
});
