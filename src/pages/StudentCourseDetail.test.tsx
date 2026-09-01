import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentCourseDetail from './StudentCourseDetail';

const mockAuthContext = {
  user: {
    id: 'auth-user-1',
    name: 'Jordan Miller',
    email: 'jordan@example.com',
    role: 'student' as const,
    canvas_student_id: 'canvas-student-1',
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
      data: [{ id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 }],
    });
    mockGetStudentEarnedBadges.mockResolvedValue({
      data: { student_id: 'student-1', total_badges: 0, badges: [] },
    });
  });

  test('a beginner-tier (25-49%) skill does not count toward "mastered in this course"', async () => {
    mockGetSkillProgress.mockResolvedValue({
      data: {
        student_id: 'student-1',
        course_id: 'course-1',
        skill_progress: {
          Loops: { score: 30, level: 'beginner', total_questions: 3, correct_answers: 1 },
        },
        last_updated: '2026-08-01T00:00:00Z',
      },
    });

    renderAtCourse('course-1');

    await waitFor(() => {
      expect(screen.getByText('Data Structures')).toBeInTheDocument();
    });

    expect(screen.getByText("You haven't mastered a skill in this course yet.")).toBeInTheDocument();
  });

  test('an intermediate-tier (50%+) skill does count toward "mastered in this course"', async () => {
    mockGetSkillProgress.mockResolvedValue({
      data: {
        student_id: 'student-1',
        course_id: 'course-1',
        skill_progress: {
          Recursion: { score: 80, level: 'advanced', total_questions: 10, correct_answers: 8 },
        },
        last_updated: '2026-08-01T00:00:00Z',
      },
    });

    renderAtCourse('course-1');

    await waitFor(() => {
      expect(screen.getByText('Data Structures')).toBeInTheDocument();
    });

    expect(screen.getByText('1 skill mastered in this course.')).toBeInTheDocument();
  });

  test('shows a not-found message when the course is not in the student\'s enrollments', async () => {
    renderAtCourse('course-does-not-exist');

    await waitFor(() => {
      expect(screen.getByText('Course not found')).toBeInTheDocument();
    });
  });
});
