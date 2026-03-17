import { getServiceHost } from './utils';

export interface Email {
  to: string;
  subject: string;
  body: string;
}

export async function history(forEmail?: string): Promise<Email[]> {
  const workflowsAddress = await getServiceHost('workflows', 3014);

  const response = await fetch(`http://${workflowsAddress}/_history`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  });

  const result: Email[] = await response.json();

  if (!forEmail) {
    return result;
  }

  return result.filter(result => result.to === forEmail);
}
