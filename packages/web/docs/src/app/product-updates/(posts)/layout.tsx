'use client';

import type { ReactElement, ReactNode } from 'react';
import { ConfiguredGiscus } from '../../../components/configured-giscus';
import { ProductUpdateHeader } from './product-update-header';

const Layout = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <>
      <ProductUpdateHeader />
      {children}
      <div className="container !max-w-[65rem]">
        <ConfiguredGiscus />
      </div>
    </>
  );
};

export default Layout;
