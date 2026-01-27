type HeaderProps = {
  children?: React.ReactNode;
};

export function Header({ children }: HeaderProps) {
  return (
    <header className="h-(--header-height) bg-neutral-3 container flex items-center justify-between">
      {children}
    </header>
  );
}
