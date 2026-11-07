import { headerStyles } from './header.css';

type HeaderProps = {
  children?: React.ReactNode;
};

export function Header({ children }: HeaderProps) {
  return (
    <div className={headerStyles.root}>
      <header className={headerStyles.bar}>{children}</header>
    </div>
  );
}
