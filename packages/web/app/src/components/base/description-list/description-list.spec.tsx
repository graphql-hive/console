// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { DescriptionList } from './description-list';

describe('DescriptionList', () => {
  it('renders a copyable value as a chip carrying the attrs', () => {
    render(
      <DescriptionList
        rows={[
          {
            items: [
              {
                term: 'Sign-in URL',
                description: 'https://app.example.com/auth/oidc?id=1',
                mono: true,
                copyable: true,
                attrs: { 'data-oidc-property-sign-in-url': '' },
              },
            ],
          },
        ]}
      />,
    );
    const value = document.querySelector('span[data-oidc-property-sign-in-url]') as HTMLElement;
    expect(value.textContent).toBe('https://app.example.com/auth/oidc?id=1');
    expect(value.closest('button')).not.toBeNull();
    expect(value.closest('div')?.className).toContain('font-mono');
  });

  it('puts the attrs on a plain value and an info icon on a term with a tooltip', () => {
    render(
      <DescriptionList
        rows={[
          {
            items: [
              {
                term: 'User ID Claim',
                tooltip: 'The claim that identifies a user.',
                description: 'sub',
                attrs: { 'data-cy': 'user-id-claim' },
              },
            ],
          },
        ]}
      />,
    );
    expect(document.querySelector('[data-cy="user-id-claim"]')?.textContent).toBe('sub');
    expect(screen.getByText('User ID Claim').querySelector('svg')).not.toBeNull();
  });
});
