import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '../../../contexts/ThemeContext';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  test('renders all three options, with the active one visually marked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: /light mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark mode/i })).toBeInTheDocument();
    // Auto is the default theme, so it's the one marked pressed on first render.
    expect(screen.getByRole('button', { name: /auto mode/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('clicking Dark switches the active state and applies the dark class', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /dark mode/i }));
    expect(screen.getByRole('button', { name: /dark mode/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /light mode/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(document.documentElement).toHaveClass('dark');
  });
});
