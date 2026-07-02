import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { passwordRules } from '../utils/passwordPolicy';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { useAuth } from '../contexts/AuthContext';
import Signup from './Signup';

// Mock the AuthContext
const mockSignup = jest.fn();
const mockAuthContext = {
  user: null,
  logout: jest.fn(),
  backendAvailable: true,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  signup: mockSignup,
  refreshUser: jest.fn(),
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock react-hot-toast (Signup.tsx uses the default export)
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const SignupWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Signup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue(mockAuthContext);
  });

  test('renders signup form correctly', () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    expect(screen.getByText('Create Instructor Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/canvas api token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('displays Canvas token instructions', () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    expect(screen.getByText(/How to get your Canvas API Token/i)).toBeInTheDocument();
    expect(screen.getByText(/Log into your Canvas LMS account/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Account → Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Click "New Access Token"/i)).toBeInTheDocument();
  });

  test('validates all required fields', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(passwordRules.minLength.message)).toBeInTheDocument();
    });
  });

  test('validates password complexity', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(passwordInput, { target: { value: 'password' } }); // No uppercase or digit
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(passwordRules.pattern.message)).toBeInTheDocument();
    });
  });
  test('validates password confirmation', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('handles successful signup', async () => {
    mockSignup.mockResolvedValue(true);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const tokenInput = screen.getByLabelText(/canvas api token/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    const validToken = '7~' + 'a'.repeat(62);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(tokenInput, { target: { value: validToken } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        canvasApiToken: validToken,
        canvasTokenType: 'instructor'
      });
    });
  });

  test('handles signup failure', async () => {
    mockSignup.mockResolvedValue(false);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const tokenInput = screen.getByLabelText(/canvas api token/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    const validToken = '7~' + 'a'.repeat(62);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(tokenInput, { target: { value: validToken } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
    });
  });

  test('shows loading state during signup', async () => {
    let resolveSignup: (value: boolean) => void;
    const signupPromise = new Promise<boolean>((resolve) => {
      resolveSignup = resolve;
    });
    mockSignup.mockReturnValue(signupPromise);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const tokenInput = screen.getByLabelText(/canvas api token/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    const validToken = '7~' + 'a'.repeat(62);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(tokenInput, { target: { value: validToken } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Resolve the promise
    resolveSignup!(true);
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  test('login link navigation', () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const loginLink = screen.getByText('Sign in');
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  test('handles special characters in name', async () => {
    mockSignup.mockResolvedValue(true);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const tokenInput = screen.getByLabelText(/canvas api token/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    const specialName = "José María O'Connor-Smith";
    const validToken = '7~' + 'a'.repeat(62);

    fireEvent.change(nameInput, { target: { value: specialName } });
    fireEvent.change(emailInput, { target: { value: 'jose@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.change(tokenInput, { target: { value: validToken } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: specialName
        })
      );
    });
  });

  test('handles long names', async () => {
    mockSignup.mockResolvedValue(true);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const longName = 'Professor Dr. John William Alexander Smith-Richardson III';

    fireEvent.change(nameInput, { target: { value: longName } });
    expect(nameInput).toHaveValue(longName);
  });

  test('clears validation errors on input change', async () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    // Trigger validation error
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    // Type in name field
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    // Error should clear
    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  test('handles keyboard navigation', () => {
    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);

    nameInput.focus();
    expect(nameInput).toHaveFocus();

    userEvent.tab();
    expect(emailInput).toHaveFocus();
  });

  test('handles backend unavailable state', () => {
    const offlineAuthContext = {
      ...mockAuthContext,
      backendAvailable: false,
    };

    jest.mocked(useAuth).mockReturnValue(offlineAuthContext);

    render(
      <SignupWrapper>
        <Signup />
      </SignupWrapper>
    );

    // Should still render the form even when backend is unavailable
    expect(screen.getByText('Create Instructor Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
}); 