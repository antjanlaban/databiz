'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="pt-16 w-full">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

