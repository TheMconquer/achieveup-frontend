import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentSkills from './StudentSkills';

const mockAuthContext = {
  user: {
    id: 'student-1',
    name: 'Tino Indo',
    email: 'indo@example.com',
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

describe('StudentSkills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists attempted skills across courses, weakest first', async () => {
    mockGetCourses.mockResolvedValue({
      data: [
        { id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 },
        { id: 'course-2', name: 'Intro Programming', code: 'COP3502', term: 1 },
      ],
    });
    mockGetSkillProgress.mockImplementation((_studentId: string, courseId: string) => {
      if (courseId === 'course-1') {
        return Promise.resolve({
          data: {
            student_id: 'student-1',
            course_id: 'course-1',
            skill_progress: {
              'Big-O Analysis': {
                score: 92,
                level: 'advanced',
                total_questions: 25,
                correct_answers: 23,
              },
            },
            last_updated: '2026-08-01T00:00:00Z',
          },
        });
      }
      return Promise.resolve({
        data: {
          student_id: 'student-1',
          course_id: 'course-2',
          skill_progress: {
            Loops: { score: 40, level: 'beginner', total_questions: 3, correct_answers: 1 },
          },
          last_updated: '2026-08-01T00:00:00Z',
        },
      });
    });

    render(
      <MemoryRouter>
        <StudentSkills />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Loops')).toBeInTheDocument();
    });
    expect(screen.getByText('Big-O Analysis')).toBeInTheDocument();
    expect(screen.getByText('Skills Attempted').nextSibling).toHaveTextContent('2');

    // Weakest-first ordering: Loops (40%) should render before Big-O Analysis (92%)
    const names = screen.getAllByText(/Loops|Big-O Analysis/).map((el) => el.textContent);
    expect(names.indexOf('Loops')).toBeLessThan(names.indexOf('Big-O Analysis'));
  });

  test('paginates at 10 skills per page', async () => {
    const skillProgress: Record<
      string,
      { score: number; level: 'beginner'; total_questions: number; correct_answers: number }
    > = {};
    for (let i = 1; i <= 12; i++) {
      skillProgress[`Skill ${i}`] = {
        score: i,
        level: 'beginner',
        total_questions: 3,
        correct_answers: 1,
      };
    }

    mockGetCourses.mockResolvedValue({
      data: [{ id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 }],
    });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        student_id: 'student-1',
        course_id: 'course-1',
        skill_progress: skillProgress,
        last_updated: '2026-08-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <StudentSkills />
      </MemoryRouter>
    );

    // Weakest-first: page 1 shows Skill 1 (score 1) through Skill 10 (score 10).
    await waitFor(() => {
      expect(screen.getByText('Skill 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Skill 10')).toBeInTheDocument();
    expect(screen.queryByText('Skill 11')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Skill 11')).toBeInTheDocument();
    expect(screen.getByText('Skill 12')).toBeInTheDocument();
    expect(screen.queryByText('Skill 1')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('shows the empty state when no skills have been attempted', async () => {
    mockGetCourses.mockResolvedValue({
      data: [{ id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 }],
    });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        student_id: 'student-1',
        course_id: 'course-1',
        skill_progress: {},
        last_updated: '2026-08-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <StudentSkills />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/your top skills will show up here/i)).toBeInTheDocument();
    });
  });

  test('shows an error banner when courses fail to load', async () => {
    mockGetCourses.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <StudentSkills />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/couldn't be loaded from Canvas/i)).toBeInTheDocument();
    });
  });
});
