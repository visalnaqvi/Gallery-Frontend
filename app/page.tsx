'use client';

import GroupsList from '@/components/groups/GroupsList';
import { Suspense } from 'react';

export default function GroupsPage() {

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}><GroupsList /></Suspense>
    </div>
  );
}
