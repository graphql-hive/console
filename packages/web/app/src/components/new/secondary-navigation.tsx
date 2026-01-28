type SecondaryNavigationProps = {
  children?: React.ReactNode;
};

export function SecondaryNavigation({ children }: SecondaryNavigationProps) {
  return (
    <div className="h-(--tabs-navbar-height) border-neutral-5 bg-neutral-3 relative border-b">
      {children}
    </div>
  );
}
