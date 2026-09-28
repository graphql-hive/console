import { Link, LinkProps } from '@tanstack/react-router';

type PrimaryNavigationLinkProps = {
  linkText: string;
  linkProps: Pick<LinkProps, 'to' | 'params'>;
};

export function PrimaryNavigationLink({ linkProps, linkText }: PrimaryNavigationLinkProps) {
  return (
    <Link
      to={linkProps.to}
      params={linkProps.params}
      className="text-fg-default max-w-[200px] shrink-0 truncate text-sm font-medium"
    >
      {linkText}
    </Link>
  );
}
