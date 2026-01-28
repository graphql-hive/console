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
      className="text-neutral-11 max-w-[200px] shrink-0 truncate font-medium"
    >
      {linkText}
    </Link>
  );
}
