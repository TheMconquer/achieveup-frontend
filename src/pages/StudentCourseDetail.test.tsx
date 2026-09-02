import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentCourseDetail from './StudentCourseDetail';

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

const mockGetCourses = jest.fn();
const mockGetSkillProgress = jest.fn();
const mockGetStudentEarnedBadges = jest.fn();

jest.mock('../services/api', () => ({
  canvasAPI: { getCourses: () => mockGetCourses() },
  progressAPI: { getSkillProgress: (...args: unknown[]) => mockGetSkillProgress(...args) },
  badgeAPI: { getStudentEarnedBadges: (...args: unknown[]) => mockGetStudentEarnedBadges(...args) },
}));

const renderAtCourse = (courseId: string) =>
  render(
    <MemoryRouter initialEntries={[`/courses/${courseId}`]}>
      <Routes>
        <Route path="/courses/:courseId" element={<StudentCourseDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('StudentCourseDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetCourses.mockResolvedValue({
      data: [
        { id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 },
        { id: 'course-2', name: 'Databases', code: 'COP3538', term: 1 },
      ],
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
    mockGetStudentEarnedBadges.mockResolvedValue({
      data: {
        student_id: 'student-1',
        total_badges: 2,
        badges: [
          {
            badge_id: 'badge-1',
            badge_name: 'Recursion Badge',
            skill_name: 'Recursion',
            badge_level: 'expert',
            progress_percentage: 92,
            earned_at: '2026-07-28T00:00:00Z',
            course_id: 'course-1',
            course_name: 'Data Structures',
          },
          {
            badge_id: 'badge-2',
            badge_name: 'SQL Badge',
            skill_name: 'SQL Joins',
            badge_level: 'intermediate',
            progress_percentage: 60,
            earned_at: '2026-07-20T00:00:00Z',
            course_id: 'course-2',
            course_name: 'Databases',
          },
        ],
      },
    });
  });

  test('renders course name, skills, and only badges earned in this course', async () => {
    renderAtCourse('course-1');

    await waitFor(() => {
      expect(screen.getByText('Data Structures')).toBeInTheDocument();
    });

    expect(screen.getByText('COP3530')).toBeInTheDocument();
    expect(screen.getByText('Big-O Analysis')).toBeInTheDocument();
    expect(screen.getByText('Recursion')).toBeInTheDocument();
    expect(screen.queryByText('SQL Joins')).not.toBeInTheDocument();
  });

  test('shows a not-found state when the course id has no match', async () => {
    renderAtCourse('course-nonexistent');

    await waitFor(() => {
      expect(screen.getByText('Course not found')).toBeInTheDocument();
    });
  });

  test('shows an error state when courses fail to load', async () => {
    mockGetCourses.mockRejectedValue(new Error('network error'));

    renderAtCourse('course-1');

    await waitFor(() => {
      expect(screen.getByText('Could not load this course')).toBeInTheDocument();
    });
  });
});
