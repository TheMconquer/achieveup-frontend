import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, badgeAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { toast } from 'react-hot-toast';
import Card from '../components/common/Card';
import RecentBadgesGrid, { RecentBadgeSummary } from '../components/StudentPortal/RecentBadgesGrid';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const BADGES_PER_PAGE = 10;

interface EarnedBadge extends RecentBadgeSummary {
  courseId: string;
}

const StudentBadges: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadBadges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);

    // Fetched independently — like the Skills page, the course filter should
    // list every enrolled course (so it's visible even with zero badges yet),
    // not just the courses that happen to already have a badge.
    const [coursesResult, badgesResult] = await Promise.allSettled([
      canvasAPI.getCourses(),
      badgeAPI.getStudentEarnedBadges(user.canvas_student_id!),
    ]);

    if (coursesResult.status === 'fulfilled') {
      setCourses(coursesResult.value.data);
    } else {
      console.error('Error loading courses:', coursesResult.reason);
      setLoadError(true);
    }

    if (badgesResult.status === 'fulfilled') {
      setBadges(
        badgesResult.value.data.badges.map((badge) => ({
          id: badge.badge_id,
          skillName: badge.skill_name,
          courseName: badge.course_name || 'Course',
          courseId: badge.course_id,
          level: badge.badge_level,
          earnedAt: badge.earned_at,
        }))
      );
    } else {
      console.error('Error loading badges:', badgesResult.reason);
      toast.error('Could not load your badges. Please try refreshing.');
      setLoadError(true);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  // Distinct courses that actually have a badge — used for the "Courses
  // Represented" stat, which is a narrower question than "how many courses
  // am I enrolled in" (that's what `courses` / the filter dropdown answer).
  const coursesWithBadges = useMemo(() => {
    return new Set(badges.map((badge) => badge.courseId)).size;
  }, [badges]);

  const visibleBadges = useMemo(() => {
    const filtered =
      courseFilter === 'all' ? badges : badges.filter((badge) => badge.courseId === courseFilter);
    // Most recently earned first — unlike the Skills page, there's no
    // "weakest" badge to surface; recency is what's actually interesting.
    return [...filtered].sort(
      (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
    );
  }, [badges, courseFilter]);

  useEffect(() => {
    setPage(1);
  }, [courseFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleBadges.length / BADGES_PER_PAGE));
  const pagedBadges = visibleBadges.slice((page - 1) * BADGES_PER_PAGE, page * BADGES_PER_PAGE);

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
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Badges</h1>
        <p className="mt-1.5 text-sm text-gray-600">
          Every badge you've earned, across all your courses — most recent first.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Some of your data couldn't be loaded. Try refreshing the page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="p-6">
          <div className="text-[13px] font-medium text-gray-500">Badges Earned</div>
          <div className="mt-2 text-[28px] font-bold leading-none text-gray-900">{badges.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-[13px] font-medium text-gray-500">Courses Represented</div>
          <div className="mt-2 text-[28px] font-bold leading-none text-gray-900">
            {coursesWithBadges}
          </div>
        </Card>
      </div>

      <Card
        title="All Badges"
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
        <RecentBadgesGrid badges={pagedBadges} />

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

export default StudentBadges;
