import { button, email, mjml } from '../src/lib/emails/components.js';


describe('email', () => {
  it('preserves button URLs without modification', () => {
    const url =
      'https://graphql-hive-dataservicelayer-dev01.vvvvvv.wwwwwww.xx.yyyyyy.zzzz/auth/reset-password?rid=thirdpartyemailpassword&tenantId=public&token=xxxxxxxxxxxxxxxxxxxxxxxxxxx';

    const html = email({
      title: 'Test Email',
      body: mjml`${button({ url, text: 'Click here' })}`,
    });

    expect(html).toContain(url);
  });

  it('preserves button URLs with special characters', () => {
    const url =
      'https://graphql-hive-dataservicelayer-dev01.vvvvvv.wwwwwww.xx.yyyyyy.zzzz/auth/reset-password?rid=thirdpartyemailpassword&tenantId=public&token=xxxxxxxxxxxxxxxxxxxxxxxxxxx';

    const html = email({
      title: 'Test Email',
      body: mjml`${button({ url, text: 'Verify Email' })}`,
    });

    expect(html).toContain(url);
  });
});
