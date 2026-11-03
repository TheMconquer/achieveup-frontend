import React from 'react';
import { Link } from 'react-router-dom';
import { NavigationItem } from './types';

interface NavLinksProps {
  items: NavigationItem[];
  currentPath: string;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

// Label uses a darker amber than the brand gold so it clears WCAG AA (4.5:1)
// against the cream background; the icon uses amber-700 to clear the 3:1
// non-text minimum (amber-600 falls just short at 2.94:1).
const ACTIVE_LINK_CLASSES =
  'bg-au-gold-selected text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
const ACTIVE_ICON_CLASSES = 'text-amber-700 dark:text-amber-400';

const NavLinks: React.FC<NavLinksProps> = ({ items, currentPath, variant, onNavigate }) => {
  const isDesktop = variant === 'desktop';

  const links = items.map((item) => {
    const Icon = item.icon;
    const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);

    if (item.disabled) {
      return (
        <span
          key={item.name}
          title="Coming soon"
          aria-disabled="true"
          className={
            isDesktop
              ? 'flex h-[42px] cursor-not-allowed items-center gap-4 rounded-lg px-4 text-sm font-medium text-gray-300'
              : 'flex cursor-not-allowed items-center rounded-lg px-4 py-3 text-base font-medium text-gray-300'
          }
        >
          <Icon className={isDesktop ? 'h-[18px] w-[18px] flex-shrink-0' : 'mr-3 h-5 w-5'} />
          <span>{item.name}</span>
        </span>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={onNavigate}
        className={
          isDesktop
            ? `flex h-[42px] items-center gap-4 rounded-lg px-4 text-sm font-medium transition-colors ${
                isActive
                  ? ACTIVE_LINK_CLASSES
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            : `flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                isActive
                  ? ACTIVE_LINK_CLASSES
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
        }
      >
        <Icon
          className={`${isDesktop ? 'h-[18px] w-[18px] flex-shrink-0' : 'mr-3 h-5 w-5'} ${
            isActive ? ACTIVE_ICON_CLASSES : ''
          }`}
        />
        <span>{item.name}</span>
      </Link>
    );
  });

  return isDesktop ? (
    <nav aria-label="Main" className="space-y-2">{links}</nav>
  ) : (
    <div className="space-y-1">{links}</div>
  );
};

export default NavLinks;
