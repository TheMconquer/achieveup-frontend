import { act, renderHook } from '@testing-library/react';
import { useCopyToClipboard } from './useCopyToClipboard';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('copies text and reports "copied" for 2 seconds, then resets', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });

  const { result } = renderHook(() => useCopyToClipboard());
  expect(result.current.copied).toBe(false);

  await act(async () => {
    result.current.copy('hello');
  });

  expect(writeText).toHaveBeenCalledWith('hello');
  expect(result.current.copied).toBe(true);

  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(result.current.copied).toBe(false);
});

test('does nothing (and never throws) when the Clipboard API is unavailable', () => {
  Object.assign(navigator, { clipboard: undefined });
  const { result } = renderHook(() => useCopyToClipboard());

  expect(() => act(() => result.current.copy('hello'))).not.toThrow();
  expect(result.current.copied).toBe(false);
});

test('a failed write never leaves "copied" stuck true', async () => {
  const writeText = jest.fn().mockRejectedValue(new Error('denied'));
  Object.assign(navigator, { clipboard: { writeText } });

  const { result } = renderHook(() => useCopyToClipboard());

  await act(async () => {
    result.current.copy('hello');
  });

  expect(result.current.copied).toBe(false);
});
