import * as http from 'node:http';
import * as foo from '@whatwg-node/server';

const adapter = foo.createServerAdapter(async request => {
  console.log(JSON.stringify(await request.json(), null, 2));

  return new Response('{}');
});

http.createServer(adapter).listen(9898);
