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
      className="text-neutral-10 hover:text-neutral-12 inline-flex items-center gap-1 text-sm transition-colors"
    >
      <ArrowLeft className="size-4" /> {copy}
    </Link>
  );
}
