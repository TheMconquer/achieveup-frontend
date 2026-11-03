import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from './ThemeContext';

const STORAGE_KEY = 'achieveup-theme';

// Lets each test control what the OS/browser reports for prefers-color-scheme.
const setSystemPrefersDark = (matches: boolean) => {
  let listener: ((event: MediaQueryListEvent) => void) | null = null;
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    fireChange: (nextMatches: boolean) => {
      act(() => {
        listener?.({ matches: nextMatches } as MediaQueryListEvent);
      });
    },
  };
};

const Probe: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('auto')}>auto</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  test('defaults to auto, resolving to light when the OS has no dark preference', () => {
    setSystemPrefersDark(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  test('auto resolves to dark when the OS prefers dark', () => {
    setSystemPrefersDark(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  test('explicit dark stays dark even if the OS prefers light', () => {
    setSystemPrefersDark(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('dark'));
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  test('persists the explicit choice to localStorage and restores it on next mount', () => {
    setSystemPrefersDark(false);
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('dark'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    unmount();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  test('auto mode follows a live OS preference change without remounting', () => {
    const { fireChange } = setSystemPrefersDark(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(document.documentElement).not.toHaveClass('dark');

    fireChange(true);
    expect(document.documentElement).toHaveClass('dark');

    fireChange(false);
    expect(document.documentElement).not.toHaveClass('dark');
  });

  test('switching back to auto after an explicit choice re-applies the OS preference', () => {
    setSystemPrefersDark(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('light'));
    expect(document.documentElement).not.toHaveClass('dark');

    fireEvent.click(screen.getByText('auto'));
    expect(document.documentElement).toHaveClass('dark');
  });

  test('useTheme throws when used outside a ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
