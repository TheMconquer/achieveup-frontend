import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, badgeAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { toast } from 'react-hot-toast';
import Card from '../components/common/Card';
import RecentBadgesGrid, { RecentBadgeSummary } from '../components/StudentPortal/RecentBadgesGrid';
import { AlertTriangle, ChevronLeft, ChevronRight, Share2, Copy, Check } from 'lucide-react';
import { getApiErrorMessage } from '../utils/apiError';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

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

  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharingOptedOut, setSharingOptedOut] = useState(false);
  const [shareActionLoading, setShareActionLoading] = useState(false);
  const { copied: linkCopied, copy: copyShareLink } = useCopyToClipboard();

  const loadBadges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);

    // Fetched independently — like the Skills page, the course filter should
    // list every enrolled course (so it's visible even with zero badges yet),
    // not just the courses that happen to already have a badge.
    const [coursesResult, badgesResult, shareStatusResult] = await Promise.allSettled([
      canvasAPI.getCourses(),
      badgeAPI.getStudentEarnedBadges(user.canvas_student_id!),
      badgeAPI.getBadgeShareStatus(),
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

    if (shareStatusResult.status === 'fulfilled') {
      setShareLink(shareStatusResult.value.data.share_link);
      setSharingOptedOut(shareStatusResult.value.data.opted_out);
    } else {
      console.error('Error loading badge share status:', shareStatusResult.reason);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const handleGetShareLink = async () => {
    setShareActionLoading(true);
    try {
      const response = await badgeAPI.generateBadgeShareLink();
      setShareLink(response.data.share_link);
    } catch (err: unknown) {
      console.error('Error creating badge share link:', err);
      toast.error(getApiErrorMessage(err) || 'Could not create your share link.');
    } finally {
      setShareActionLoading(false);
    }
  };

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
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300">
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

      <Card title="Share Your Achievements">
        {sharingOptedOut ? (
          <p className="text-sm text-gray-600">
            Badge sharing is turned off.{' '}
            <Link to="/settings" className="font-medium text-au-gold hover:underline">
              Turn it back on in Settings
            </Link>{' '}
            to get a public link.
          </p>
        ) : shareLink ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-600 sm:flex-shrink-0">
              Anyone with this link can view your badges:
            </p>
            <input
              type="text"
              readOnly
              value={shareLink}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
              aria-label="Your public badge profile link"
            />
            <button
              type="button"
              onClick={() => copyShareLink(shareLink)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Get a public link you can share to show off your badges.
            </p>
            <button
              type="button"
              onClick={handleGetShareLink}
              disabled={shareActionLoading}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-au-gold px-4 py-1.5 text-sm font-medium text-gray-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Share Badges
            </button>
          </div>
        )}
      </Card>

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
