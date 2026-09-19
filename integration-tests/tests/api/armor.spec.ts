import { getServiceHost } from '../../testkit/utils';

const registryAddress = await getServiceHost('server', 8082);
const endpoint = `http://${registryAddress}/graphql`;

test.each(['__hive_typename__', '__responseCacheTypeName', '__responseCacheId'])(
  'returns 400 when the reserved alias %s is used',
  async alias => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/graphql-response+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: `{ ${alias}: __typename }` }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: `The alias "${alias}" cannot be used.`,
        },
      ],
    });
  },
);

test('returns 400 when the maximum number of aliases is exceeded', async () => {
  const aliases = Array.from({ length: 21 }, (_, index) => `alias${index}: __typename`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/graphql-response+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: `{ ${aliases.join('\n')} }` }),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    errors: [
      {
        message: expect.stringContaining('Aliases limit of 20 exceeded'),
      },
    ],
  });
});

test('returns 400 when the maximum number of tokens is exceeded', async () => {
  const fields = Array.from({ length: 801 }, () => '__typename');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/graphql-response+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: `{ ${fields.join('\n')} }` }),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    errors: [
      {
        message: expect.stringContaining('Token limit of 800 exceeded'),
      },
    ],
  });
});
