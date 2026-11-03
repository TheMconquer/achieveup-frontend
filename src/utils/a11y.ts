import type React from 'react';

/** onKeyDown for a non-button element acting as one: Enter and Space activate it. */
export const onActivateKey =
  (handler: () => void) =>
  (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
