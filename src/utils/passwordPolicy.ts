export const PASSWORD_MIN_LENGTH = 8;

// Requires at least one lowercase letter, one uppercase letter, and one digit
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// For react-hook-form's register(), e.g. {...register('password', passwordRules)}
export const passwordRules = {
  required: 'Password is required',
  minLength: {
    value: PASSWORD_MIN_LENGTH,
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  },
  pattern: {
    value: PASSWORD_COMPLEXITY_REGEX,
    message: 'Password must contain uppercase, lowercase, and a number',
  },
};

// For imperative/manual checks outside react-hook-form, e.g. Settings.tsx
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return 'Password must contain uppercase, lowercase, and a number';
  }
  return null;
}
