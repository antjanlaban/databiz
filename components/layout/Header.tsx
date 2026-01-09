'use client';

import { usePageTitle } from './PageTitleContext';

export default function Header() {
  const { title } = usePageTitle();

  return (
    <header className="fixed top-0 left-64 right-0 h-16 border-b border-border bg-card z-10">
      <div className="flex h-full items-center justify-between px-8">
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-xl font-semibold text-foreground">
              {title}
            </h1>
          )}
        </div>
      </div>
    </header>
  );
}

