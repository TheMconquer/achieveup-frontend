import { summarizeCourseProgress } from './courseSummary';
import { CanvasCourse, StudentProgress } from '../types';

const course: CanvasCourse = { id: 'course-1', name: 'Data Structures', code: 'COP3530', term: 1 };

const buildProgress = (skillProgress: StudentProgress['skill_progress']): StudentProgress => ({
  student_id: 'student-1',
  course_id: 'course-1',
  skill_progress: skillProgress,
  last_updated: '2026-08-01T00:00:00Z',
});

describe('summarizeCourseProgress', () => {
  test('no attempted skills yields null average and "Not started yet"', () => {
    const { summary, attemptedSkills } = summarizeCourseProgress(course, null);

    expect(attemptedSkills).toEqual([]);
    expect(summary).toEqual({
      id: 'course-1',
      name: 'Data Structures',
      code: 'COP3530',
      averageScore: null,
      nextHint: 'Not started yet',
    });
  });

  test('ignores skills with zero attempted questions', () => {
    const progress = buildProgress({
      Untouched: { score: 0, level: 'beginner', total_questions: 0, correct_answers: 0 },
    });

    const { summary, attemptedSkills } = summarizeCourseProgress(course, progress);

    expect(attemptedSkills).toEqual([]);
    expect(summary.averageScore).toBeNull();
  });

  test('all attempted skills above the developing tier reports "On track"', () => {
    const progress = buildProgress({
      'Big-O Analysis': { score: 92, level: 'advanced', total_questions: 25, correct_answers: 23 },
      Recursion: { score: 80, level: 'advanced', total_questions: 10, correct_answers: 8 },
    });

    const { summary, attemptedSkills } = summarizeCourseProgress(course, progress);

    expect(attemptedSkills).toEqual([
      { name: 'Big-O Analysis', courseId: 'course-1', courseName: 'Data Structures', score: 92 },
      { name: 'Recursion', courseId: 'course-1', courseName: 'Data Structures', score: 80 },
    ]);
    expect(summary.averageScore).toBe(86);
    expect(summary.nextHint).toBe('On track');
  });

  test('surfaces the lowest-scoring developing skill as the review hint', () => {
    const progress = buildProgress({
      Strong: { score: 90, level: 'advanced', total_questions: 10, correct_answers: 9 },
      Weakest: { score: 20, level: 'beginner', total_questions: 10, correct_answers: 2 },
      AlsoWeak: { score: 40, level: 'beginner', total_questions: 10, correct_answers: 4 },
    });

    const { summary } = summarizeCourseProgress(course, progress);

    expect(summary.nextHint).toBe('Review: Weakest');
  });
});
