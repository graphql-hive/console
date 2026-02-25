// Helpful layout utils for stories

type ChildrenProp = {
  children: React.ReactNode;
};

export function Flex({ children }: ChildrenProp) {
  return <div className="flex items-center justify-center gap-4 p-32">{children}</div>;
}
