// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { labelize } from './errors-and-changes';

describe('labelize', () => {
  it('wraps single- and double-quoted segments in a Label and drops the quotes', () => {
    const { container } = render(<>{labelize('Field "User.id" conflicts with \'Account.id\'')}</>);
    const labels = [...container.querySelectorAll('span')].map(label => label.textContent);
    expect(labels).toEqual(['User.id', 'Account.id']);
    expect(container.textContent).toBe('Field User.id conflicts with Account.id');
  });

  it('leaves a message without quotes untouched', () => {
    const { container } = render(<>{labelize('Composition succeeded')}</>);
    expect(container.querySelectorAll('span')).toHaveLength(0);
    expect(container.textContent).toBe('Composition succeeded');
  });
});
