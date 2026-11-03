import React, { ReactNode, Suspense } from 'react';
import PageLoading from '../common/PageLoading';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* First tab stop: lets keyboard users jump past the sidebar and header. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-amber-700 dark:focus:ring-au-gold"
      >
        Skip to main content
      </a>

      <Navigation />

      <main
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none min-h-screen bg-gray-50 pt-16 md:pt-[72px] md:ml-[230px]"
      >
        <div className="w-full px-6 py-8 lg:px-10">
          {/* Keeps the sidebar and header on screen while a lazy page loads. */}
          <Suspense fallback={<PageLoading />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
};

export default Layout;
