import { renderHook } from '@testing-library/react';
import { useNoIndex } from './useNoIndex';

const robotsMeta = () => document.head.querySelector('meta[name="robots"]');

describe('useNoIndex', () => {
  test('adds a noindex robots tag while mounted and removes it afterwards', () => {
    const { unmount } = renderHook(() => useNoIndex());
    expect(robotsMeta()).toHaveAttribute('content', 'noindex, nofollow');

    unmount();
    expect(robotsMeta()).toBeNull();
  });
});
