import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import SkillVideoPanel from '../components/StudentPortal/SkillVideoPanel';
import { useAttemptedSkills } from '../hooks/useAttemptedSkills';
import { tierForScore, tierLabel, tierTextClass, tierBgClass } from '../utils/skillTiers';
import { AlertTriangle, ChevronLeft, ChevronRight, PlayCircle, Info, X, ThumbsUp, ThumbsDown } from 'lucide-react';

const SKILLS_PER_PAGE = 5;

const StudentSkillVideoInfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">About These Videos</h2>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-6 text-sm text-gray-700">
        <div>
          <p className="mb-2 font-medium text-gray-900">What the tags mean</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                Instructor Recommended
              </span>
              <span>Personally picked by your instructor.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                Instructor Verified
              </span>
              <span>Found by AI, then reviewed and approved by your instructor.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                No tag
              </span>
              <span>Found by AI and not yet reviewed by your instructor.</span>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-medium text-gray-900">What upvote / downvote means</p>
          <p className="flex items-start gap-2">
            <ThumbsUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>
              Click if the video actually helped you understand the skill — it tells your
              instructor this video is working.
            </span>
          </p>
          <p className="mt-2 flex items-start gap-2">
            <ThumbsDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>Click if it didn't help — this flags it so your instructor can swap it out.</span>
          </p>
        </div>
      </div>
    </div>
  </div>
);

const StudentSkillVideos: React.FC = () => {
  const { user } = useAuth();
  const { attemptedSkills, courses, loading, loadError } = useAttemptedSkills(
    user?.canvas_student_id
  );
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const visibleSkills = useMemo(() => {
    const filtered =
      courseFilter === 'all'
        ? attemptedSkills
        : attemptedSkills.filter((skill) => skill.courseId === courseFilter);
    // Weakest first — videos matter most for the skills you're struggling with.
    return [...filtered].sort((a, b) => a.score - b.score);
  }, [attemptedSkills, courseFilter]);

  useEffect(() => {
    setPage(1);
  }, [courseFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleSkills.length / SKILLS_PER_PAGE));
  const pagedSkills = visibleSkills.slice((page - 1) * SKILLS_PER_PAGE, page * SKILLS_PER_PAGE);

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
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Skill Videos</h1>
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            aria-label="What the video tags and votes mean"
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-gray-600">
          Recommended videos for every skill you've attempted — weakest first.
        </p>
      </div>

      {showInfoModal && <StudentSkillVideoInfoModal onClose={() => setShowInfoModal(false)} />}

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Some of your data couldn't be loaded from Canvas. Try refreshing the page.
        </div>
      )}

      <Card
        title="Videos By Skill"
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
        {pagedSkills.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No quiz attempts yet — recommended videos will show up here once you've taken a Canvas quiz.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {pagedSkills.map((skill, index) => {
              const tier = tierForScore(skill.score);
              return (
                <div key={`${skill.courseId}-${skill.name}-${index}`} className="py-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tierBgClass[tier]} ${tierTextClass[tier]}`}
                    >
                      <PlayCircle className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-semibold text-gray-900">{skill.name}</span>
                      {courseFilter === 'all' && (
                        <span className="text-xs text-gray-500">{skill.courseName}</span>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-[15px] font-bold text-gray-900">
                      {skill.score}%
                    </span>
                    <span className="hidden flex-shrink-0 text-xs text-gray-500 sm:block">
                      {tierLabel[tier]}
                    </span>
                  </div>
                  <SkillVideoPanel courseId={skill.courseId} skillName={skill.name} />
                </div>
              );
            })}
          </div>
        )}

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

export default StudentSkillVideos;
