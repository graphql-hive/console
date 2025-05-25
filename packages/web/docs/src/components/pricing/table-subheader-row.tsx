'use client';

import { ReactNode } from 'react';

export interface TableSubheaderRowProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
}
export function TableSubheaderRow({ icon, title, description }: TableSubheaderRowProps) {
  return (
    <tr className="subheader">
      <td colSpan={4} className="pb-6 pt-8">
        <div className="flex items-center text-[32px]/10 max-md:text-[20px]/6 max-md:font-medium [&>svg]:m-[6.67px] [&>svg]:mr-[10.67px] [&>svg]:size-[26.67px] [&>svg]:text-green-600">
          {icon}
          {title}
        </div>
        <p className="mt-2 text-green-800">{description}</p>
      </td>
    </tr>
  );
}
