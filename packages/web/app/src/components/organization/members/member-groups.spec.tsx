// @vitest-environment jsdom
import { makeFragmentData } from '@/gql';
import { render } from '@testing-library/react';
import { MemberGroups, MemberGroups_GroupFragment } from './list';

vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

function groups(...names: string[]) {
  return names.map((name, index) =>
    makeFragmentData(
      { __typename: 'Group' as const, id: `group-${index}`, name },
      MemberGroups_GroupFragment,
    ),
  );
}

describe('MemberGroups', () => {
  it('says there are none', () => {
    const { container } = render(<MemberGroups groups={[]} />);
    expect(container.textContent).toBe('Groups: none');
  });

  it('lists up to two groups on the row', () => {
    const { container } = render(<MemberGroups groups={groups('Hive Console', 'Guild Members')} />);
    expect(container.textContent).toBe('Groups:Hive ConsoleGuild Members');
  });

  it('collapses the rest into a +N badge', () => {
    const { container } = render(
      <MemberGroups groups={groups('Hive Console', 'Guild Members', 'Billing', 'Support')} />,
    );
    expect(container.textContent).toBe('Groups:Hive ConsoleGuild Members+2');
  });

  it('cuts a long group name at sixteen characters', () => {
    const { container } = render(<MemberGroups groups={groups('Handcrafted Granite Chair')} />);
    expect(container.textContent).toBe('Groups:Handcrafted Gran…');
  });
});
