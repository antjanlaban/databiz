'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/datasets');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Doorverwijzen naar datasets...</p>
    </div>
  );
}
