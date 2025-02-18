import { fastify } from 'fastify';
import { createClient } from './client';

const client = createClient({
  issuer: 'http://localhost:3001/identity',
  clientID: 'web app',
});

const app = fastify({
  disableRequestLogging: false,
});

app.post('/callback', () => {
  console.log('POST /callback');
});

await app.listen(3000);

const { challenge, url } = await client.authorize('http://localhost:3000/callback', 'code', {
  pkce: true,
  provider: 'github',
});
let response = await fetch(url);

invariant(response.status === 200, 'Expected 200, got ' + response.status);

console.log(response.url);
console.log(response.headers);
const location = new URL(response.url);
const code = location.searchParams.get('code');
// expect(code).not.toBeNull();

invariant(!!code, 'Expected code to be defined, got ' + code);

const exchanged = await client.exchange(
  code!,
  'https://client.example.com/callback',
  challenge.verifier,
);
if (exchanged.err) throw exchanged.err;
const tokens = exchanged.tokens;

console.log(tokens);

const verified = await client.verify({}, tokens.access);
if (verified.err) throw verified.err;

console.log('verified.subject', verified.subject);
// expect(verified.subject).toStrictEqual({
//   type: "user",
//   properties: {
//     userID: "123",
//   },
// })

function invariant(check: boolean, message: string) {
  if (!check) {
    throw new Error(message);
  }
}
