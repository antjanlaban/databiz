'use client';

import { PageTitleProvider } from './PageTitleContext';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTitleProvider>{children}</PageTitleProvider>;
}

