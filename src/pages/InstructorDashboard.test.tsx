import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import InstructorDashboard from './InstructorDashboard';
import { useAuth } from '../contexts/AuthContext';
import { canvasInstructorAPI, instructorAPI, skillMatrixAPI } from '../services/api';
import { toast } from 'react-hot-toast';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  canvasInstructorAPI: { getInstructorCourses: jest.fn() },
  instructorAPI: { getInstructorDashboard: jest.fn() },
  skillMatrixAPI: { getAllByCourse: jest.fn() },
}));

jest.mock('react-hot-toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const instructorWithToken = {
  id: 'i1',
  name: 'Jane Instructor',
  email: 'jane@example.com',
  role: 'instructor' as const,
  canvasTokenType: 'instructor' as const,
  hasCanvasToken: true,
};
const instructorNoToken = { ...instructorWithToken, hasCanvasToken: false };

const mockAuth = (user: typeof instructorWithToken) => {
  jest.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    isAuthenticated: true,
    backendAvailable: true,
    isInstructor: true,
    isStudent: false,
  });
};

const course = (id: string, name: string) => ({ id, name, code: `COP-${id}` });

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <InstructorDashboard />
    </MemoryRouter>
  );

// Stat cards render as adjacent siblings ("2" next to "Active Courses",
// "45" next to "Total Students", etc.) with plain numbers, so a bare
// getByText('2') is ambiguous whenever two cards happen to share a value -
// scope to the specific card by its label instead.
const statValue = (label: string) => screen.getByText(label).previousElementSibling?.textContent;

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows a loading spinner before data resolves', () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockReturnValue(new Promise(() => {}));
  const { container } = renderDashboard();

  expect(container.querySelector('.animate-spin')).toBeInTheDocument();
});

test('on success, shows real course/student/matrix counts', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: [course('c1', 'Data Structures'), course('c2', 'Databases')],
  } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockResolvedValue({
    data: { totalCourses: 2, students: 45, averageProgress: 62, recentActivity: [] },
  } as any);
  jest.mocked(skillMatrixAPI.getAllByCourse).mockResolvedValue({ data: [{ id: 'm1' }] } as any);

  renderDashboard();

  await waitFor(() => expect(screen.getByText('Jane Instructor', { exact: false })).toBeInTheDocument());
  expect(statValue('Active Courses')).toBe('2');
  expect(statValue('Total Students')).toBe('45');
  expect(screen.getByText('Data Structures')).toBeInTheDocument();
});

test('a Canvas outage (5xx) shows the Canvas-unavailable banner, not "0 courses" and "Connected"', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue(
    { isAxiosError: true, response: { status: 502, data: { message: 'Canvas error' } } }
  );

  renderDashboard();

  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Canvas to load your courses");
  expect(screen.getByText('Canvas Unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Canvas Connected')).not.toBeInTheDocument();
  expect(statValue('Active Courses')).toBe('—');
});

test('an error body returned with 200 is treated as Canvas being unavailable, not a course list', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: { error: 'Failed to fetch instructor courses: 503', statusCode: 503 },
  } as any);

  renderDashboard();

  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Canvas to load your courses");
  expect(statValue('Active Courses')).toBe('—');
});

test('a non-outage courses failure points to the token in Settings', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue(
    { isAxiosError: true, response: { status: 400, data: { message: 'Invalid Canvas token' } } }
  );

  renderDashboard();

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Check your Canvas token in Settings');
  expect(screen.getByText('Canvas Error')).toBeInTheDocument();
});

test('"Try again" reloads the courses and clears the banner once Canvas answers', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValueOnce(
    { isAxiosError: true, response: { status: 502 } }
  );
  renderDashboard();
  await screen.findByRole('alert');

  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: [course('c1', 'Data Structures')],
  } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockResolvedValue({ data: { students: 3 } } as any);
  jest.mocked(skillMatrixAPI.getAllByCourse).mockResolvedValue({ data: [] } as any);
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));

  await waitFor(() => expect(screen.getByText('Data Structures')).toBeInTheDocument());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(statValue('Active Courses')).toBe('1');
});

test('a courses-load failure without a Canvas token is silent (expected, not an error)', async () => {
  mockAuth(instructorNoToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue(new Error('No token'));

  renderDashboard();

  await waitFor(() => expect(screen.getByText('Getting Started Tips')).toBeInTheDocument());
  expect(toast.error).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('courses succeed but the dashboard-stats call fails independently: courses still show, student/progress stats fall back to zero, with a toast (has token)', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: [course('c1', 'Data Structures')],
  } as any);
  jest.mocked(skillMatrixAPI.getAllByCourse).mockResolvedValue({ data: [] } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockRejectedValue(new Error('stats down'));

  renderDashboard();

  await waitFor(() => expect(screen.getByText('Data Structures')).toBeInTheDocument());
  expect(jest.mocked(toast.error)).toHaveBeenCalledWith(
    'Could not load instructor dashboard data. Data shown may be incomplete.'
  );
  expect(statValue('Active Courses')).toBe('1'); // still reflects the real course count
  expect(statValue('Total Students')).toBe('0');
});

test('the dashboard-stats failure toast is suppressed without a Canvas token', async () => {
  mockAuth(instructorNoToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({ data: [] } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockRejectedValue(new Error('stats down'));

  renderDashboard();

  await waitFor(() => expect(screen.getByText('Getting Started Tips')).toBeInTheDocument());
  expect(toast.error).not.toHaveBeenCalled();
});

test('skill matrix count sums across courses, tolerating one course failing independently', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: [course('c1', 'Course One'), course('c2', 'Course Two')],
  } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockResolvedValue({
    data: { totalCourses: 2, students: 0, averageProgress: 0, recentActivity: [] },
  } as any);
  jest.mocked(skillMatrixAPI.getAllByCourse).mockImplementation((courseId: string) =>
    courseId === 'c1'
      ? Promise.resolve({ data: [{ id: 'm1' }, { id: 'm2' }] } as any)
      : Promise.reject(new Error('matrix fetch failed for c2'))
  );

  renderDashboard();

  await waitFor(() => expect(screen.getByText('Course One')).toBeInTheDocument());
  // 2 matrices from c1, c2's failure caught and contributes 0 - not a thrown error.
  expect(statValue('Skill Matrices')).toBe('2');
});

describe('workflow step 3 ("Track Student Progress")', () => {
  const baseCourses = () =>
    jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
      data: [course('c1', 'Course One')],
    } as any);

  test('is always "upcoming" even when matrices exist (steps 1/2 would otherwise read completed/current)', async () => {
    mockAuth(instructorWithToken);
    baseCourses();
    jest.mocked(instructorAPI.getInstructorDashboard).mockResolvedValue({
      data: { totalCourses: 1, students: 0, averageProgress: 0, recentActivity: [] },
    } as any);
    jest.mocked(skillMatrixAPI.getAllByCourse).mockResolvedValue({ data: [{ id: 'm1' }] } as any);

    renderDashboard();

    await waitFor(() => expect(screen.getByText(/Step 3: Track Student Progress/)).toBeInTheDocument());
    const step3Row = screen.getByText(/Step 3: Track Student Progress/).closest('div.relative') as HTMLElement;
    expect(step3Row).toHaveTextContent('Step 3: Track Student Progress');
    // "upcoming" styling (gray), never the gold/green "current"/"completed" treatment.
    expect(within(step3Row).queryByText('Start')).not.toBeInTheDocument();
  });
});

test('greets the user according to the time of day', async () => {
  mockAuth(instructorWithToken);
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({ data: [] } as any);
  jest.mocked(instructorAPI.getInstructorDashboard).mockResolvedValue({
    data: { totalCourses: 0, students: 0, averageProgress: 0, recentActivity: [] },
  } as any);

  const getHoursSpy = jest.spyOn(Date.prototype, 'getHours');

  getHoursSpy.mockReturnValue(9);
  const { unmount } = renderDashboard();
  await waitFor(() => expect(screen.getByText(/Good morning/)).toBeInTheDocument());
  unmount();

  getHoursSpy.mockReturnValue(14);
  const afternoon = renderDashboard();
  await waitFor(() => expect(screen.getByText(/Good afternoon/)).toBeInTheDocument());
  afternoon.unmount();

  getHoursSpy.mockReturnValue(20);
  renderDashboard();
  await waitFor(() => expect(screen.getByText(/Good evening/)).toBeInTheDocument());

  getHoursSpy.mockRestore();
});
