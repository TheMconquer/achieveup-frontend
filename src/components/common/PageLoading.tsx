import React from 'react';

/** Placeholder shown while a lazily loaded page's code downloads. */
const PageLoading: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status">
    <div
      className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"
      aria-hidden="true"
    />
    <span className="sr-only">Loading…</span>
  </div>
);

export default PageLoading;
