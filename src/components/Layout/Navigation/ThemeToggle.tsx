import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../../../contexts/ThemeContext';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'auto', label: 'Auto', Icon: Monitor },
];

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 py-2.5">
      <p className="mb-1.5 text-xs text-gray-400">Appearance</p>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`${label} mode`}
            aria-pressed={theme === value}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              theme === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeToggle;
