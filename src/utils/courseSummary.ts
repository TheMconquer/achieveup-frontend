import { CanvasCourse, StudentProgress } from '../types';
import { CourseOverviewSummary } from '../components/StudentPortal/CourseOverviewGrid';
import { tierForScore } from './skillTiers';

export interface AttemptedSkill {
  name: string;
  courseId: string;
  score: number;
}

export interface CourseProgressSummary {
  summary: CourseOverviewSummary;
  attemptedSkills: AttemptedSkill[];
}

export function summarizeCourseProgress(
  course: CanvasCourse,
  progress: StudentProgress | null
): CourseProgressSummary {
  const attempted = Object.entries(progress?.skill_progress ?? {}).filter(
    ([, data]) => data.total_questions > 0
  );

  const attemptedSkills: AttemptedSkill[] = attempted.map(([name, data]) => ({
    name,
    courseId: course.id,
    score: Math.round(data.score),
  }));

  const averageScore =
    attempted.length > 0
      ? Math.round(attempted.reduce((sum, [, data]) => sum + data.score, 0) / attempted.length)
      : null;

  const weakestSkill = attempted
    .filter(([, data]) => {
      const tier = tierForScore(data.score);
      return tier === 'developing' || tier === 'beginner';
    })
    .sort((a, b) => a[1].score - b[1].score)[0];

  let nextHint = 'Not started yet';
  if (averageScore !== null) {
    nextHint = weakestSkill ? `Review: ${weakestSkill[0]}` : 'On track';
  }

  return {
    summary: {
      id: course.id,
      name: course.name,
      code: course.code,
      averageScore,
      nextHint,
    },
    attemptedSkills,
  };
}
