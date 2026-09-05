import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, progressAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { toast } from 'react-hot-toast';
import Card from '../components/common/Card';
import SkillMasteryList from '../components/StudentPortal/SkillMasteryList';
import { summarizeCourseProgress, AttemptedSkill } from '../utils/courseSummary';
import { tierForScore } from '../utils/skillTiers';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const SKILLS_PER_PAGE = 10;

const StudentSkills: React.FC = () => {
  const { user } = useAuth();
  const [attemptedSkills, setAttemptedSkills] = useState<AttemptedSkill[]>([]);
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadSkills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);

    let loadedCourses: CanvasCourse[] = [];
    try {
      const coursesResponse = await canvasAPI.getCourses();
      loadedCourses = coursesResponse.data;
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Could not load your courses. Please try refreshing.');
      setLoadError(true);
    }
    setCourses(loadedCourses);

    const progressResults = await Promise.all(
      loadedCourses.map((course) =>
        progressAPI
          .getSkillProgress(user.canvas_student_id!, course.id)
          .then((res) => ({ course, progress: res.data }))
          .catch(() => ({ course, progress: null }))
      )
    );

    const skills: AttemptedSkill[] = [];
    progressResults.forEach(({ course, progress }) => {
      skills.push(...summarizeCourseProgress(course, progress).attemptedSkills);
    });

    setAttemptedSkills(skills);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const visibleSkills = useMemo(() => {
    const filtered =
      courseFilter === 'all'
        ? attemptedSkills
        : attemptedSkills.filter((skill) => skill.courseId === courseFilter);
    // Weakest first — a full skills list is most useful as "what to review",
    return [...filtered].sort((a, b) => a.score - b.score);
  }, [attemptedSkills, courseFilter]);

  useEffect(() => {
    setPage(1);
  }, [courseFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleSkills.length / SKILLS_PER_PAGE));
  const pagedSkills = visibleSkills.slice((page - 1) * SKILLS_PER_PAGE, page * SKILLS_PER_PAGE);

  const averageScore = attemptedSkills.length
    ? Math.round(
        attemptedSkills.reduce((sum, skill) => sum + skill.score, 0) / attemptedSkills.length
      )
    : 0;
  const masteredCount = attemptedSkills.filter(
    (skill) => tierForScore(skill.score) !== 'developing'
  ).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-au-gold" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mb-1">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Skills</h1>
        <p className="mt-1.5 text-sm text-gray-600">
          Every skill you've attempted, across all your courses — weakest first.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Some of your data couldn't be loaded from Canvas. Try refreshing the page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-6">
          <div className="text-[13px] font-medium text-gray-500">Skills Attempted</div>
          <div className="mt-2 text-[28px] font-bold leading-none text-gray-900">
            {attemptedSkills.length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-[13px] font-medium text-gray-500">Overall Mastery</div>
          <div className="mt-2 text-[28px] font-bold leading-none text-gray-900">
            {averageScore}%
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-[13px] font-medium text-gray-500">Skills Mastered</div>
          <div className="mt-2 text-[28px] font-bold leading-none text-gray-900">
            {masteredCount}
          </div>
        </Card>
      </div>

      <Card
        title="All Skills"
        headerActions={
          courses.length > 1 ? (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
              aria-label="Filter by course"
            >
              <option value="all">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        <SkillMasteryList
          skills={pagedSkills.map((skill) => ({
            name: skill.name,
            score: skill.score,
            courseName: courseFilter === 'all' ? skill.courseName : undefined,
          }))}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentSkills;
