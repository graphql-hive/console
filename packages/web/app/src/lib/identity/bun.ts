import { createClient } from './client';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

const client = createClient({
  clientID: 'jwt-api',
  issuer: 'http://localhost:3001/identity',
});

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (url.pathname === '/' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization');

      if (!authHeader) {
        return new Response('401 - No Authorization header', {
          headers,
          status: 401,
        });
      }

      const token = authHeader.split(' ')[1];
      const verified = await client.verify({}, token);

      if (verified.err) {
        return new Response('401 error' + verified.err, {
          headers,
          status: 401,
        });
      }

      return Response.json(verified.subject, { headers });
    }

    return new Response('404', { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
