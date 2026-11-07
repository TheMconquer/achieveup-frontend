import { renderHook, waitFor } from '@testing-library/react';
import { useCourseList } from './useCourseList';
import { canvasAPI } from '../services/api';

jest.mock('../services/api', () => ({
  canvasAPI: { getInstructorCourses: jest.fn(), getCourses: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('loads the instructor course list', async () => {
  jest.mocked(canvasAPI.getInstructorCourses).mockResolvedValue({ data: [{ id: '1', name: 'A' }] } as any);
  const { result } = renderHook(() => useCourseList(true));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.courses).toEqual([{ id: '1', name: 'A' }]);
  expect(result.current.error).toBe(false);
});

test('an error body instead of a list is an error, not a course list', async () => {
  jest.mocked(canvasAPI.getInstructorCourses).mockResolvedValue({
    data: { error: 'Failed to fetch instructor courses: 503', statusCode: 503 },
  } as any);
  const { result } = renderHook(() => useCourseList(true));

  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.courses).toEqual([]);
  expect(result.current.canvasUnavailable).toBe(true);
});

test('a 5xx is a Canvas outage; a 4xx is not', async () => {
  for (const [status, unavailable] of [[502, true], [400, false]] as const) {
    jest.mocked(canvasAPI.getInstructorCourses).mockRejectedValue({ isAxiosError: true, response: { status } });
    const { result, unmount } = renderHook(() => useCourseList(true));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.canvasUnavailable).toBe(unavailable);
    unmount();
  }
});
