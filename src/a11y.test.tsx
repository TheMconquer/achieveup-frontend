// Automated accessibility checks (axe) for the sign-in and sign-up forms and
// the navigation. jsdom can't measure colour contrast, so axe skips that rule
// here; contrast still needs checking in a real browser.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Home, Sparkles } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NavLinks from './components/Layout/Navigation/NavLinks';

expect.extend(toHaveNoViolations);

jest.mock('./contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

const mockAuthContext = {
  user: null,
  logout: jest.fn(),
  backendAvailable: true,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  signup: jest.fn(),
  refreshUser: jest.fn(),
  isInstructor: false,
  isStudent: false,
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue(mockAuthContext);
  });

  test('sign-in form has no axe violations, including with errors shown', async () => {
    const { container } = render(<Login />, { wrapper: Wrapper });
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const email = screen.getByLabelText(/email address/i);
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription('Email is required');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('autocomplete', 'current-password');
    expect(await axe(container)).toHaveNoViolations();
  });

  test('sign-up form has no axe violations and shows password rules up front', async () => {
    const { container } = render(<Signup />, { wrapper: Wrapper });
    expect(await axe(container)).toHaveNoViolations();

    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAccessibleDescription(/at least 8 characters/i);
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete', 'name');

    await userEvent.click(screen.getByRole('button', { name: /create account|sign up/i }));
    await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'));
    expect(password).toHaveAccessibleDescription(/at least 8 characters.*password is required/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  test.each(['desktop', 'mobile'] as const)(
    '%s navigation is a landmark and marks the current page',
    async (variant) => {
      const items = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Skill Matrix', href: '/skill-matrix', icon: Sparkles },
      ];
      const { container } = render(
        <NavLinks items={items} currentPath="/skill-matrix" variant={variant} />,
        { wrapper: Wrapper }
      );
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Skill Matrix' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
      expect(await axe(container)).toHaveNoViolations();
    }
  );
});
