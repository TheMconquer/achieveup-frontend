import React, { useId } from 'react';
import { clsx } from 'clsx';
import { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error
    ? `${inputId}-error`
    : helperText
    ? `${inputId}-helper`
    : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ucf-gold focus:border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300',
          className
        )}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={descriptionId}
        {...props}
      />
      {(error || helperText) && (
        <p id={descriptionId} className={clsx(
          'mt-1 text-sm',
          error ? 'text-red-600' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input; 