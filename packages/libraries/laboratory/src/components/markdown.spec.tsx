// @vitest-environment jsdom
// happy-dom's parser drops elements DOMPurify would have kept (`<strong>`, `<a>`),
// which makes the "was it stripped?" assertions below pass for the wrong reason.
import { render } from '@testing-library/react';
import { Markdown } from './markdown';

// Descriptions come from whatever endpoint the Lab is pointed at, so these are the
// cases that matter: the GraphiQL CVE-2021-41248 class of attack.
describe('Markdown', () => {
  const html = (content: string) => render(<Markdown content={content} />).container.innerHTML;

  it('renders ordinary markdown', () => {
    expect(html('**bold** and `code`')).toContain('<strong>bold</strong>');
    expect(html('**bold** and `code`')).toContain('<code>code</code>');
  });

  it('strips script tags', () => {
    const output = html('before <script>alert(1)</script> after');

    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert(1)');
  });

  it('strips event handlers on injected elements', () => {
    const output = html('<img src=x onerror=alert(1)>');

    expect(output).not.toContain('onerror');
    expect(output).not.toContain('<img');
  });

  it('drops javascript: hrefs', () => {
    const output = html('[click](javascript:alert(1))');

    expect(output).not.toContain('javascript:');
  });

  it('keeps ordinary links and hardens them', () => {
    const output = html('[docs](https://example.com)');

    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain('target="_blank"');
  });

  it('strips iframes', () => {
    expect(html('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe');
  });
});
