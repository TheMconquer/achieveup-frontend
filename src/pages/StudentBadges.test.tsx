import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentBadges from './StudentBadges';

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
const mockGetStudentEarnedBadges = jest.fn();

jest.mock('../services/api', () => ({
  canvasAPI: { getCourses: () => mockGetCourses() },
  badgeAPI: { getStudentEarnedBadges: (...args: unknown[]) => mockGetStudentEarnedBadges(...args) },
}));

describe('StudentBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCourses.mockResolvedValue({
      data: [{ id: 'course-1', name: 'Intro Programming', code: 'COP3502', term: 1 }],
    });
  });

  test('lists earned badges across courses, most recent first', async () => {
    mockGetStudentEarnedBadges.mockResolvedValue({
      data: {
        student_id: 'student-1',
        total_badges: 2,
        badges: [
          {
            badge_id: 'badge-1',
            badge_name: 'Beginner in Loops',
            skill_name: 'Loops',
            badge_level: 'beginner',
            progress_percentage: 33,
            earned_at: '2026-08-01T00:00:00Z',
            course_id: 'course-1',
            course_name: 'Intro Programming',
          },
          {
            badge_id: 'badge-2',
            badge_name: 'Expert in Recursion',
            skill_name: 'Recursion',
            badge_level: 'expert',
            progress_percentage: 95,
            earned_at: '2026-08-15T00:00:00Z',
            course_id: 'course-1',
            course_name: 'Intro Programming',
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <StudentBadges />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Loops')).toBeInTheDocument();
    });
    expect(screen.getByText('Recursion')).toBeInTheDocument();
    expect(screen.getByText('Badges Earned').nextSibling).toHaveTextContent('2');

    // Most-recent-first: Recursion (Aug 15) should render before Loops (Aug 1)
    const names = screen.getAllByText(/Loops|Recursion/).map((el) => el.textContent);
    expect(names.indexOf('Recursion')).toBeLessThan(names.indexOf('Loops'));
  });

  test('paginates at 10 badges per page', async () => {
    const badges = Array.from({ length: 12 }, (_, i) => ({
      badge_id: `badge-${i + 1}`,
      badge_name: `Badge ${i + 1}`,
      skill_name: `Skill ${i + 1}`,
      badge_level: 'beginner',
      progress_percentage: 30,
      earned_at: new Date(2026, 0, i + 1).toISOString(),
      course_id: 'course-1',
      course_name: 'Intro Programming',
    }));

    mockGetStudentEarnedBadges.mockResolvedValue({
      data: { student_id: 'student-1', total_badges: 12, badges },
    });

    render(
      <MemoryRouter>
        <StudentBadges />
      </MemoryRouter>
    );

    // Most-recent-first: page 1 shows Skill 12 down through Skill 3.
    await waitFor(() => {
      expect(screen.getByText('Skill 12')).toBeInTheDocument();
    });
    expect(screen.getByText('Skill 3')).toBeInTheDocument();
    expect(screen.queryByText('Skill 2')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Skill 2')).toBeInTheDocument();
    expect(screen.getByText('Skill 1')).toBeInTheDocument();
    expect(screen.queryByText('Skill 3')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('shows the empty state when no badges have been earned', async () => {
    mockGetStudentEarnedBadges.mockResolvedValue({
      data: { student_id: 'student-1', total_badges: 0, badges: [] },
    });

    render(
      <MemoryRouter>
        <StudentBadges />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/badges appear automatically/i)).toBeInTheDocument();
    });
  });

  test('shows the course filter even with zero badges, as long as there are multiple enrolled courses', async () => {
    mockGetCourses.mockResolvedValue({
      data: [
        { id: 'course-1', name: 'Intro Programming', code: 'COP3502', term: 1 },
        { id: 'course-2', name: 'Data Structures', code: 'COP3530', term: 1 },
      ],
    });
    mockGetStudentEarnedBadges.mockResolvedValue({
      data: { student_id: 'student-1', total_badges: 0, badges: [] },
    });

    render(
      <MemoryRouter>
        <StudentBadges />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by course/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Courses Represented').nextSibling).toHaveTextContent('0');
  });

  test('shows an error banner when badges fail to load', async () => {
    mockGetStudentEarnedBadges.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <StudentBadges />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/couldn't be loaded/i)).toBeInTheDocument();
    });
  });
});
