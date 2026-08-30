import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, progressAPI, badgeAPI } from '../services/api';
import { CanvasCourse } from '../types';
import Card from '../components/common/Card';
import MasteryRing from '../components/StudentPortal/MasteryRing';
import SkillMasteryList from '../components/StudentPortal/SkillMasteryList';
import RecentBadgesGrid, { RecentBadgeSummary } from '../components/StudentPortal/RecentBadgesGrid';
import { summarizeCourseProgress, AttemptedSkill } from '../utils/courseSummary';
import { tierForScore, tierLabel } from '../utils/skillTiers';
import { ArrowLeft, AlertCircle, Info } from 'lucide-react';

const StudentCourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();

  const [course, setCourse] = useState<CanvasCourse | null>(null);
  const [attemptedSkills, setAttemptedSkills] = useState<AttemptedSkill[]>([]);
  const [badges, setBadges] = useState<RecentBadgeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !courseId) return;

    const loadCourseDetail = async () => {
      setLoading(true);
      setError(false);
      setNotFound(false);

      let courses: CanvasCourse[] = [];
      try {
        const coursesResponse = await canvasAPI.getCourses();
        courses = coursesResponse.data;
      } catch (err) {
        console.error('Error loading course:', err);
        setError(true);
        setLoading(false);
        return;
      }

      const matchedCourse = courses.find((c) => c.id === courseId);
      if (!matchedCourse) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCourse(matchedCourse);

      const [progressResult, badgesResult] = await Promise.all([
        progressAPI
          .getSkillProgress(user.canvas_student_id!, courseId)
          .then((res) => res.data)
          .catch(() => null),
        badgeAPI.getStudentEarnedBadges(user.canvas_student_id!).catch(() => null),
      ]);

      setAttemptedSkills(summarizeCourseProgress(matchedCourse, progressResult).attemptedSkills);
      setBadges(
        (badgesResult?.data.badges ?? [])
          .filter((badge) => badge.course_id === courseId)
          .map((badge) => ({
            id: badge.badge_id,
            skillName: badge.skill_name,
            courseName: badge.course_name || matchedCourse.name,
            level: badge.badge_level,
            earnedAt: badge.earned_at,
          }))
      );
      setLoading(false);
    };

    loadCourseDetail();
  }, [user, courseId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-au-gold" />
      </div>
    );
  }

  if (error || notFound) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          {notFound ? 'Course not found' : 'Could not load this course'}
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          {notFound
            ? "This course wasn't found in your Canvas enrollments."
            : 'Please try refreshing the page.'}
        </p>
        <Link to="/courses" className="text-sm font-semibold text-au-gold">
          ← Back to My Courses
        </Link>
      </Card>
    );
  }

  const averageScore = attemptedSkills.length
    ? Math.round(attemptedSkills.reduce((sum, skill) => sum + skill.score, 0) / attemptedSkills.length)
    : 0;
  const masteredCount = attemptedSkills.filter(
    (skill) => tierForScore(skill.score) !== 'developing'
  ).length;

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        to="/courses"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Courses
      </Link>

      <div className="mb-1">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">{course!.name}</h1>
        <p className="mt-1.5 text-sm text-gray-600">{course!.code}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-gray-900">Course Mastery</span>
              <Info
                className="h-4 w-4 text-gray-400"
                aria-label="Average mastery across skills attempted in this course"
              />
            </div>

            <div className="mt-4 flex min-h-0 flex-1 items-center">
              <div className="flex flex-1 items-center justify-center pr-5">
                <MasteryRing percent={averageScore}>
                  <span className="text-[28px] font-bold leading-none text-gray-900">
                    {averageScore}%
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-gray-600">
                    {tierLabel[tierForScore(averageScore)]}
                  </span>
                </MasteryRing>
              </div>

              <div className="h-[105px] w-px flex-shrink-0 bg-gray-200" />

              <div className="flex flex-1 items-center pl-6">
                <p className="max-w-[155px] text-[13px] leading-5 text-gray-600">
                  {masteredCount > 0
                    ? `${masteredCount} skill${masteredCount === 1 ? '' : 's'} mastered in this course.`
                    : "You haven't mastered a skill in this course yet."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="h-[220px] p-6">
          <div className="flex h-full flex-col">
            <span className="text-[15px] font-semibold text-gray-900">Badges Earned</span>
            <div className="mt-5 text-[32px] font-bold leading-none text-gray-900">
              {badges.length}
            </div>
            <div className="mt-2 text-[13px] text-gray-500">In this course</div>
          </div>
        </Card>
      </div>

      <Card title="Skills">
        <SkillMasteryList skills={attemptedSkills.map((skill) => ({ name: skill.name, score: skill.score }))} />
      </Card>

      <Card title="Badges Earned">
        <RecentBadgesGrid badges={badges} />
      </Card>
    </div>
  );
};

export default StudentCourseDetail;
