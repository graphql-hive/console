import { ArrowLeft } from 'lucide-react';
import { Link, LinkProps } from '@tanstack/react-router';
import { backLinkStyles } from './back-link.css';

export function BackLink({
  copy,
  link: { params, search = undefined, to },
}: {
  copy: string;
  link: {
    params: LinkProps['params'];
    search?: LinkProps['search'];
    to: LinkProps['to'];
  };
}) {
  return (
    <Link to={to} params={params} search={search} className={backLinkStyles.root}>
      <ArrowLeft className={backLinkStyles.icon} /> {copy}
    </Link>
  );
}
