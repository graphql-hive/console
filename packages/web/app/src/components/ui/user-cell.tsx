import { Avatar } from '@/components/ui/primitives/avatar/avatar';

export type UserCellUser = { id: string; displayName: string } | null | undefined;

/** A member by avatar and display name; a dash when there is none. */
export function UserCell({ user }: { user: UserCellUser }) {
  if (!user) return <>—</>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar size="xs" alt={user.displayName} />
      <span>{user.displayName}</span>
    </span>
  );
}
