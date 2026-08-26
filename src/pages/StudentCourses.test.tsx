import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentCourses from './StudentCourses';

const mockAuthContext = {
  user: {
    id: 'student-1',
    name: 'Jordan Miller',
    email: 'jordan@example.com',
    role: 'student' as const,
    canvas_student_id: 'student-1',
  },
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

jest.mock('react-hot-toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockGetCourses = jest.fn();
const mockGetSkillProgress = jest.fn();

jest.mock('../services/api', () => ({
  canvasAPI: { getCourses: () => mockGetCourses() },
  progressAPI: { getSkillProgress: (...args: unknown[]) => mockGetSkillProgress(...args) },
}));

describe('StudentCourses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders each course with its computed average score', async () => {
    mockGetCourses.mockResolvedValue({
      data: [{ id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 }],
    });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        student_id: 'student-1',
        course_id: 'course-1',
        skill_progress: {
          'Big-O Analysis': { score: 92, level: 'advanced', total_questions: 25, correct_answers: 23 },
        },
        last_updated: '2026-08-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <StudentCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Data Structures')).toBeInTheDocument();
    });
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Data Structures/ })).toHaveAttribute(
      'href',
      '/courses/course-1'
    );
  });

  test('shows the empty state when there are no courses', async () => {
    mockGetCourses.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <StudentCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Canvas courses found.')).toBeInTheDocument();
    });
  });

  test('shows an error banner when courses fail to load', async () => {
    mockGetCourses.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <StudentCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/couldn't be loaded from Canvas/i)).toBeInTheDocument();
    });
  });
});
