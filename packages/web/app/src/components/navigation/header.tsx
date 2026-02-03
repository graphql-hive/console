type HeaderProps = {
  children?: React.ReactNode;
};

export function Header({ children }: HeaderProps) {
  return (
    <div className="h-(--header-height) bg-neutral-3">
      <header className="container flex h-full items-center justify-between">{children}</header>
    </div>
  );
}
