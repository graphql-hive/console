import { Link, LinkProps } from '@tanstack/react-router';
import { primaryNavigationLinkStyles } from './primary-navigation-link.css';

type PrimaryNavigationLinkProps = {
  linkText: string;
  linkProps: Pick<LinkProps, 'to' | 'params'>;
};

export function PrimaryNavigationLink({ linkProps, linkText }: PrimaryNavigationLinkProps) {
  return (
    <Link to={linkProps.to} params={linkProps.params} className={primaryNavigationLinkStyles.root}>
      {linkText}
    </Link>
  );
}
