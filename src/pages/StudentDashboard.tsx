import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, progressAPI, badgeAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { toast } from 'react-hot-toast';
import Card from '../components/common/Card';
import MasteryRing from '../components/StudentPortal/MasteryRing';
import SkillMasteryList, {
  SkillMasterySummary,
} from '../components/StudentPortal/SkillMasteryList';
import RecentBadgesGrid, { RecentBadgeSummary } from '../components/StudentPortal/RecentBadgesGrid';
import CourseOverviewGrid, {
  CourseOverviewSummary,
} from '../components/StudentPortal/CourseOverviewGrid';
import { tierForScore, tierLabel, isMastered } from '../utils/skillTiers';
import { summarizeCourseProgress, AttemptedSkill } from '../utils/courseSummary';
import { BookOpen, Award, Sparkles, Info, AlertTriangle } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [courseSummaries, setCourseSummaries] = useState<CourseOverviewSummary[]>([]);
  const [attemptedSkills, setAttemptedSkills] = useState<AttemptedSkill[]>([]);
  const [badges, setBadges] = useState<RecentBadgeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Canvas is mandatory at signup, so every account here has a token — but
  // per-course skill progress and badges are fetched separately below, so a
  // failure in one shouldn't blank out data the others already loaded.
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);

    let courses: CanvasCourse[] = [];
    try {
      const coursesResponse = await canvasAPI.getCourses();
      courses = coursesResponse.data;
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Could not load your courses. Please try refreshing.');
      setLoadError(true);
    }

    const [progressResults, badgesResult] = await Promise.all([
      Promise.all(
        courses.map((course) =>
          progressAPI
            .getSkillProgress(user.canvas_student_id!, course.id)
            .then((res) => ({ course, progress: res.data }))
            .catch(() => ({ course, progress: null }))
        )
      ),
      badgeAPI.getStudentEarnedBadges(user.canvas_student_id!).catch(() => null),
    ]);

    const skills: AttemptedSkill[] = [];
    const summaries: CourseOverviewSummary[] = [];

    progressResults.forEach(({ course, progress }) => {
      const { summary, attemptedSkills } = summarizeCourseProgress(course, progress);
      skills.push(...attemptedSkills);
      summaries.push(summary);
    });

    setAttemptedSkills(skills);
    setCourseSummaries(summaries);
    setBadges(
      (badgesResult?.data.badges ?? []).map((badge) => ({
        id: badge.badge_id,
        skillName: badge.skill_name,
        courseName: badge.course_name || 'Course',
        level: badge.badge_level,
        earnedAt: badge.earned_at,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const overallMastery =
    attemptedSkills.length > 0
      ? Math.round(
          attemptedSkills.reduce((sum, skill) => sum + skill.score, 0) / attemptedSkills.length
        )
      : 0;

  const masteredCount = attemptedSkills.filter((skill) => isMastered(skill.score)).length;

  const topSkills: SkillMasterySummary[] = [...attemptedSkills]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((skill) => ({ name: skill.name, score: skill.score }));

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
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}!
        </h1>

        <p className="mt-1.5 text-sm text-gray-600">
          Here's an overview of your learning progress.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Some of your data couldn't be loaded from Canvas. Try refreshing the page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Overall Mastery */}
        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-gray-900">Overall Mastery</span>

              <Info
                className="h-4 w-4 text-gray-400"
                aria-label="Average mastery across every skill you've attempted"
              />
            </div>

            {/* BOTTOM SECTION */}
            <div className="mt-4 flex min-h-0 flex-1 items-center">
              {/* LEFT - mastery ring */}
              <div className="flex flex-1 items-center justify-center pr-5">
                <MasteryRing percent={overallMastery}>
                  <span className="text-[28px] font-bold leading-none text-gray-900">
                    {overallMastery}%
                  </span>

                  <span className="mt-1 text-[11px] font-medium text-gray-600">
                    {tierLabel[tierForScore(overallMastery)]}
                  </span>
                </MasteryRing>
              </div>

              {/* divider */}
              <div className="h-[105px] w-px flex-shrink-0 bg-gray-200" />

              {/* right - description */}
              <div className="flex flex-1 items-center pl-6">
                <p className="max-w-[155px] text-[13px] leading-5 text-gray-600">
                  {masteredCount > 0
                    ? "You're making great progress! Keep mastering new skills."
                    : "You haven't mastered a skill yet — keep going, it adds up fast."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* active Courses */}
        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-au-gold-light text-au-gold">
                <BookOpen className="h-6 w-6" />
              </div>

              <span className="text-[15px] font-semibold text-gray-900">Active Courses</span>
            </div>

            <div className="mt-5 text-[32px] font-bold leading-none text-gray-900">
              {courseSummaries.length}
            </div>

            <div className="mt-2 text-[13px] text-gray-500">Courses</div>

            <Link to="/courses" className="mt-auto text-[13px] font-semibold text-au-gold">
              View my courses →
            </Link>
          </div>
        </Card>

        {/* Badges Earned */}
        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-au-gold-light text-au-gold">
                <Award className="h-6 w-6" />
              </div>

              <span className="text-[15px] font-semibold text-gray-900">Badges Earned</span>
            </div>

            <div className="mt-5 text-[32px] font-bold leading-none text-gray-900">
              {badges.length}
            </div>

            <div className="mt-2 text-[13px] text-gray-500">Badges</div>

            <Link to="/badges" className="mt-auto text-[13px] font-semibold text-au-gold">
              View all badges →
            </Link>
          </div>
        </Card>

        {/* Skills Earned */}
        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-au-gold-light text-au-gold">
                <Sparkles className="h-6 w-6" />
              </div>

              <span className="text-[15px] font-semibold text-gray-900">Skills Earned</span>
            </div>

            <div className="mt-5 text-[32px] font-bold leading-none text-gray-900">
              {masteredCount}
            </div>

            <div className="mt-2 text-[13px] text-gray-500">Skills</div>

            <Link to="/skills" className="mt-auto text-[13px] font-semibold text-au-gold">
              View all skills →
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <Card
          className="min-h-[300px]"
          title="Top Skills"
          headerActions={
            <Link to="/skills" className="text-[13px] font-semibold text-au-gold">
              View all skills →
            </Link>
          }
        >
          <SkillMasteryList skills={topSkills} />
        </Card>

        <Card
          className="min-h-[300px]"
          title="Recent Badges"
          headerActions={
            <Link to="/badges" className="text-[13px] font-semibold text-au-gold">
              View all badges →
            </Link>
          }
        >
          <RecentBadgesGrid badges={badges.slice(0, 5)} />
        </Card>
      </div>

      <Card
        className="min-h-[220px]"
        title="Course Overview"
        headerActions={
          <Link to="/courses" className="text-[13px] font-semibold text-au-gold">
            View all courses →
          </Link>
        }
      >
        <CourseOverviewGrid courses={courseSummaries.slice(0, 4)} />
      </Card>
    </div>
  );
};

export default StudentDashboard;
