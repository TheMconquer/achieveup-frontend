import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, Sparkles, Clock, CheckCircle, BookOpen, Info, X } from 'lucide-react';
import { skillMatrixAPI, skillVideoAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCourseList } from '../hooks/useCourseList';
import { SkillMatrix, SkillVideo, CanvasCourse } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { withTimestamp, formatTimestamp } from '../utils/youtubeLinks';

const SkillVideoInfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">How Skill Video Assignment Works</h2>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 p-6 text-sm text-gray-700">
        <p>
          This page lets you curate the YouTube videos students see when they're weak in a
          specific skill. Pick a course and a skill, then:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Add a video yourself</strong> by pasting a link — it's tagged{' '}
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              Instructor Recommended
            </span>{' '}
            so students know it's been personally vetted.
          </li>
          <li>
            <strong>Click "Get AI Suggestions"</strong> to have AI find and publish videos
            automatically — these are tagged{' '}
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
              AI Suggested
            </span>{' '}
            and go live for students right away, no separate approval step needed.
          </li>
          <li>
            Reviewed an AI suggestion and like it? Click its checkmark to mark it{' '}
            <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
              Instructor Verified
            </span>
            .
          </li>
          <li>
            For a video you added yourself, click the clock icon to automatically find the
            most relevant moment in it, so the link students see jumps straight to that point.
          </li>
          <li>Students can upvote or downvote each video to tell you whether it actually helped.</li>
        </ul>
        <div className="rounded-lg bg-gray-50 p-3">
          <p>
            <strong>Another way to get here:</strong> every skill matrix on the{' '}
            <strong>Skill Matrix</strong> page has a "Manage Videos" link that drops you
            straight into that course and skill — no need to pick them again.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const SkillVideoCurator: React.FC = () => {
  const { isInstructor } = useAuth();
  const [searchParams] = useSearchParams();
  const [courseId, setCourseId] = useState<string>(searchParams.get('courseId') ?? '');
  const matrixIdParam = searchParams.get('matrixId') ?? undefined;

  const { courses, loading: coursesLoading } = useCourseList<CanvasCourse>(isInstructor, {
    eager: !courseId,
  });

  const [matrices, setMatrices] = useState<SkillMatrix[]>([]);
  const [matrixId, setMatrixId] = useState<string | undefined>(matrixIdParam);
  const [skillName, setSkillName] = useState<string>(searchParams.get('skill') ?? '');
  const [videos, setVideos] = useState<SkillVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [findingMomentId, setFindingMomentId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    skillMatrixAPI
      .getAllByCourse(courseId)
      .then((res) => {
        setMatrices(res.data);
        if (!matrixId && res.data.length > 0) {
          setMatrixId(res.data[0]._id);
        }
      })
      .catch(() => toast.error('Could not load skill matrices for this course.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const selectedMatrix = matrices.find((m) => m._id === matrixId);

  useEffect(() => {
    if (selectedMatrix && !skillName && selectedMatrix.skills.length > 0) {
      setSkillName(selectedMatrix.skills[0]);
    }
  }, [selectedMatrix, skillName]);

  const loadVideos = useCallback(() => {
    if (!courseId || !skillName) return;
    setLoadingVideos(true);
    skillVideoAPI
      .getForSkill(courseId, matrixId, skillName)
      .then((res) => setVideos(res.data.videos))
      .catch(() => toast.error('Could not load videos for this skill.'))
      .finally(() => setLoadingVideos(false));
  }, [courseId, matrixId, skillName]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleAddVideo = async () => {
    if (!newLink.trim()) {
      toast.error('Video URL is required');
      return;
    }
    setAdding(true);
    try {
      await skillVideoAPI.add({
        course_id: courseId,
        matrix_id: matrixId,
        skill_name: skillName,
        link: newLink.trim(),
        title: newTitle.trim() || undefined,
      });
      setNewTitle('');
      setNewLink('');
      toast.success('Video added');
      loadVideos();
    } catch {
      toast.error('Failed to add video');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (videoId: string) => {
    try {
      await skillVideoAPI.remove(videoId);
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
      toast.success('Video removed');
    } catch {
      toast.error('Failed to remove video');
    }
  };

  const handleFindMoment = async (video: SkillVideo) => {
    setFindingMomentId(video._id);
    try {
      const res = await skillVideoAPI.findRelevantMoment(video._id);
      setVideos((prev) => prev.map((v) => (v._id === video._id ? res.data : v)));
      toast.success(
        res.data.timestamp_seconds != null
          ? `Found it — jumps to ${formatTimestamp(res.data.timestamp_seconds)}`
          : 'Moment found'
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not find a relevant moment');
    } finally {
      setFindingMomentId(null);
    }
  };

  const handleVerify = async (video: SkillVideo) => {
    setVerifyingId(video._id);
    try {
      const res = await skillVideoAPI.verify(video._id);
      setVideos((prev) => prev.map((v) => (v._id === video._id ? res.data : v)));
      toast.success('Marked as instructor verified');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not verify this video');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleGetSuggestions = async () => {
    if (!skillName) return;
    setSuggesting(true);
    try {
      const res = await skillVideoAPI.generateAiRecommendations(courseId, matrixId, skillName);
      setVideos((prev) => [...prev, ...res.data.videos]);
      toast.success(
        res.data.videos.length === 0
          ? 'No new suggestions found.'
          : `Added ${res.data.videos.length} AI-recommended video(s) — visible to students now.`
      );
    } catch {
      toast.error('Failed to generate suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  if (!courseId) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="mb-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Skill Video Assignment</h1>
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              aria-label="How Skill Video Assignment works"
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm text-gray-600">
            Select a course to manage the videos students see for each of its skills.
          </p>
        </div>
        {showInfoModal && <SkillVideoInfoModal onClose={() => setShowInfoModal(false)} />}
        <Card title="Select a Course">
          {coursesLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : courses.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">
              No courses found. Make sure your Canvas instructor token is set up correctly.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setCourseId(course.id)}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                >
                  <BookOpen className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{course.name}</div>
                    <div className="text-xs text-gray-500">{course.code}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mb-1">
        <button
          type="button"
          onClick={() => {
            setCourseId('');
            setMatrixId(undefined);
            setSkillName('');
            setMatrices([]);
            setVideos([]);
          }}
          className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          ← Change course
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">Skill Video Assignment</h1>
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            aria-label="How Skill Video Assignment works"
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-gray-600">
          Videos students see when they're weak in a skill — added by you or suggested by AI.
          Both are visible to students right away; anything you add yourself is tagged
          "Instructor Recommended" so students know it's been personally vetted.
        </p>
      </div>

      {showInfoModal && <SkillVideoInfoModal onClose={() => setShowInfoModal(false)} />}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Skill Matrix</label>
            <select
              value={matrixId ?? ''}
              onChange={(e) => setMatrixId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {matrices.map((matrix) => (
                <option key={matrix._id} value={matrix._id}>
                  {matrix.matrix_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Skill</label>
            <select
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {(selectedMatrix?.skills ?? []).map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card
        title="Recommended Videos"
        subtitle="Visible to students studying this skill"
        headerActions={
          <Button onClick={handleGetSuggestions} loading={suggesting} size="sm" variant="outline">
            <Sparkles className="mr-1.5 inline h-4 w-4" />
            Get AI Suggestions
          </Button>
        }
      >
        {loadingVideos ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : videos.length === 0 ? (
          <p className="py-2 text-sm text-gray-500">
            No videos for this skill yet. Add one below or click "Get AI Suggestions".
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {videos.map((video) => (
              <div
                key={video._id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                {video.thumbnail && (
                  <img src={video.thumbnail} alt={video.title} className="h-14 w-24 rounded-md object-cover" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 truncate">
                    <a
                      href={withTimestamp(video.link, video.timestamp_seconds)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-semibold text-gray-900 hover:underline"
                    >
                      {video.title}
                    </a>
                    {video.source === 'manual' ? (
                      <span className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Instructor Recommended
                      </span>
                    ) : video.instructor_verified ? (
                      <span className="flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">
                        Instructor Verified
                      </span>
                    ) : (
                      <span className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                        AI Suggested
                      </span>
                    )}
                    {video.timestamp_seconds != null && (
                      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        Jumps to {formatTimestamp(video.timestamp_seconds)}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-gray-500">{video.channel}</span>
                  <span className="text-xs text-gray-400">
                    {video.upvotes ?? 0} found helpful · {video.downvotes ?? 0} did not
                  </span>
                </div>
                {video.source === 'ai_suggested' && !video.instructor_verified && (
                  <button
                    type="button"
                    onClick={() => handleVerify(video)}
                    disabled={verifyingId === video._id}
                    title="Mark as instructor verified"
                    className="flex-shrink-0 text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                  >
                    {verifyingId === video._id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-green-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                )}
                {video.source === 'manual' && (
                  <button
                    type="button"
                    onClick={() => handleFindMoment(video)}
                    disabled={findingMomentId === video._id}
                    title="Find relevant moment in this video"
                    className="flex-shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                  >
                    {findingMomentId === video._id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(video._id)}
                  title="Remove"
                  className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row">
          <input
            type="text"
            placeholder="Video title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="YouTube URL"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button onClick={handleAddVideo} loading={adding} size="sm">
            Add Video
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SkillVideoCurator;
