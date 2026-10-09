import { ArrowLeft } from 'lucide-react';
import { Link, LinkProps } from '@tanstack/react-router';

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
    <Link
      to={to}
      params={params}
      search={search}
      className="mb-5 inline-flex items-center gap-0.5 text-control text-fg-secondary transition-colors hover:text-fg"
    >
      <ArrowLeft className="size-3.5" /> {copy}
    </Link>
  );
}
