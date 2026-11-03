import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const APP_NAME = 'AchieveUp';

// Most specific prefixes first: the first match wins.
const PAGE_TITLES: Array<[string, string]> = [
  ['/badges/share/', 'Shared Badges'],
  ['/instructor-dashboard', 'Dashboard'],
  ['/student-dashboard', 'Dashboard'],
  ['/skill-matrix', 'Skill Matrix'],
  ['/skill-assignment', 'Skill Assignment'],
  ['/skill-videos', 'Skill Video Assignment'],
  ['/my-skill-videos', 'Skill Videos'],
  ['/progress', 'Student Progress'],
  ['/courses/', 'Course Details'],
  ['/courses', 'My Courses'],
  ['/skills', 'My Skills'],
  ['/badges', 'My Badges'],
  ['/settings', 'Settings'],
  ['/login', 'Sign In'],
  ['/signup', 'Create Account'],
];

export const pageTitleFor = (pathname: string): string | undefined =>
  PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1];

/**
 * Gives every route its own document title, and after client-side navigation
 * announces the new page to screen readers (which otherwise hear nothing when
 * a single-page app swaps its content).
 */
const RouteAnnouncer: React.FC = () => {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    const page = pageTitleFor(pathname);
    document.title = page ? `${page} · ${APP_NAME}` : APP_NAME;

    // The initial load is announced by the browser itself, and StrictMode's
    // repeated effect run in development must not count as a navigation.
    const previous = lastPathname.current;
    lastPathname.current = pathname;
    if (previous === null || previous === pathname) return;
    setAnnouncement(page ? `${page} page` : `${APP_NAME} page`);
  }, [pathname]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
};

export default RouteAnnouncer;
