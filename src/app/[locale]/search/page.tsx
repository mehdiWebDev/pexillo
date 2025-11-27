// app/[locale]/search/page.tsx
import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}

// Loading skeleton
function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-[4/5] bg-gray-200 rounded-2xl mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-4/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}