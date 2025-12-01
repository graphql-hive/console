import { getServiceHost } from 'testkit/utils';

const registryAddress = await getServiceHost('server', 8082);

const endpoint = `http://${registryAddress}`;

test('no origin -> no cors', async () => {
  const request = await fetch(`${endpoint}/graphql`);
  expect(request.headers.get('access-control-allow-origin')).toEqual(null);
});

test('unmatching origin -> cors error', async () => {
  const request = await fetch(`${endpoint}/graphql`, {
    headers: {
      origin: 'https://evil.com',
    },
  });
  expect(request.headers.get('access-control-allow-origin')).toEqual(null);
  expect(request.status).toEqual(403);
  expect(await request.text()).toMatchInlineSnapshot(`CORS origin not allowed.`);
});

test('matching -> cors!', async () => {
  const request = await fetch(`${endpoint}/graphql`, {
    headers: {
      origin: 'http://localhost:3000',
    },
  });
  expect(request.headers.get('access-control-allow-origin')).toEqual('http://localhost:3000');
  expect(request.status).toEqual(200);
  expect(await request.text()).toMatchInlineSnapshot(
    `{"errors":[{"message":"Must provide query string.","extensions":{"code":"BAD_REQUEST"}}]}`,
  );
});
