import { humanId } from 'human-id';
import { getServiceHost } from './utils';

export async function getRecordedRequests(): Promise<
  Array<{
    body: {
      contentType: 'application/json';
    };
    headers: {
      [key: string]: string[];
    };
    method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
  }>
> {
  const dockerAddress = await getServiceHost('mock_server', 3042);
  const res = await fetch(`http://${dockerAddress}/mockserver/retrieve?type=REQUESTS`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
    },
  });

  return res.json();
}

export async function generateMockEndpoint(): Promise<{
  url: string;
  path: string;
}> {
  let dockerAddress = await getServiceHost('mock_server', 3042);
  const path = `/random/${humanId({
    separator: '-',
    adjectiveCount: 1,
    addAdverb: true,
    capitalize: false,
  })}`;

  const res = await fetch(`http://${dockerAddress}/mockserver/expectation`, {
    method: 'PUT',
    body: JSON.stringify({
      httpRequest: {
        method: 'POST',
        path,
      },
      httpResponse: {
        statusCode: 200,
        body: 'ok',
      },
    }),
  });

  if (!res.ok) {
    console.log(await res.json());
    throw new Error('Failed to create mock endpoint');
  }

  const url = `http://mock_server:3042${path}`;

  return {
    url,
    path,
  };
}
