// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Card } from './card';
import * as styles from './card.css';

describe('Card', () => {
  it('puts actions in the title row, with the description running under both', () => {
    render(
      <Card
        title="Operation body"
        description="Fetched 2 minutes ago"
        actions={<button>Copy</button>}
      >
        <p>body</p>
      </Card>,
    );
    const title = screen.getByRole('heading', { name: 'Operation body' });
    const action = screen.getByRole('button', { name: 'Copy' });
    const row = title.parentElement!;
    expect(row.contains(action)).toBe(true);
    expect(row.className).toContain(styles.cardDiv2);
    expect(row.contains(screen.getByText('Fetched 2 minutes ago'))).toBe(false);
  });

  it('renders a header for actions alone, so the body keeps its reduced top inset', () => {
    render(
      <Card actions={<button>Refresh</button>}>
        <p>body</p>
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    expect(screen.getByText('body').parentElement!.className).toContain(styles.cardDiv4);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('keeps the title row out of the DOM when there is nothing to put in it', () => {
    render(<Card description="Only a description" />);
    const description = screen.getByText('Only a description');
    expect(description.parentElement!.children).toHaveLength(1);
  });
});
