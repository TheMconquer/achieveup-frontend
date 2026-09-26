import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { skillVideoAPI } from '../../services/api';
import { SkillVideo } from '../../types';
import { withTimestamp } from '../../utils/youtubeLinks';

export interface SkillVideoPanelProps {
  courseId: string;
  skillName: string;
}

const SkillVideoPanel: React.FC<SkillVideoPanelProps> = ({ courseId, skillName }) => {
  const [videos, setVideos] = useState<SkillVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    skillVideoAPI
      .getForSkill(courseId, undefined, skillName)
      .then((res) => {
        if (!cancelled) setVideos(res.data.videos);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, skillName]);

  const handleVote = (video: SkillVideo, voteType: 'upvote' | 'downvote') => {
    const currentVote = video.student_vote;
    const nextVote = currentVote === voteType ? 'remove' : voteType;

    // Optimistic update
    setVideos((prev) =>
      prev.map((v) => {
        if (v._id !== video._id) return v;
        const upvotes = v.upvotes ?? 0;
        const downvotes = v.downvotes ?? 0;
        let nextUpvotes = upvotes;
        let nextDownvotes = downvotes;
        if (currentVote === 'upvote') nextUpvotes = Math.max(0, nextUpvotes - 1);
        if (currentVote === 'downvote') nextDownvotes = Math.max(0, nextDownvotes - 1);
        if (nextVote === 'upvote') nextUpvotes += 1;
        if (nextVote === 'downvote') nextDownvotes += 1;
        return {
          ...v,
          upvotes: nextUpvotes,
          downvotes: nextDownvotes,
          student_vote: nextVote === 'remove' ? null : voteType,
        };
      })
    );

    skillVideoAPI
      .vote({ video_id: video._id, vote_type: nextVote })
      .catch(() => {
        // Revert on failure by re-fetching
        skillVideoAPI
          .getForSkill(courseId, undefined, skillName)
          .then((res) => setVideos(res.data.videos))
          .catch(() => {});
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="py-4 text-center text-sm text-red-600 dark:text-red-400">
        Couldn't load recommended videos. Try again later.
      </p>
    );
  }

  if (videos.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        No videos yet for this skill.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-3">
      {videos.map((video) => (
        <div
          key={video._id}
          className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
        >
          {video.thumbnail && (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="h-14 w-24 flex-shrink-0 rounded-md object-cover"
            />
          )}
          <a
            href={withTimestamp(video.link, video.timestamp_seconds)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 flex-col gap-0.5"
          >
            <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
              {video.title}
              <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-400" />
              {video.source === 'manual' ? (
                <span className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  Instructor Recommended
                </span>
              ) : video.instructor_verified ? (
                <span className="flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">
                  Instructor Verified
                </span>
              ) : null}
            </span>
            <span className="truncate text-xs text-gray-500">{video.channel}</span>
          </a>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => handleVote(video, 'upvote')}
              title="This helped"
              className={`flex items-center gap-1 text-sm ${
                video.student_vote === 'upvote' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              {video.upvotes ?? 0}
            </button>
            <button
              type="button"
              onClick={() => handleVote(video, 'downvote')}
              title="This didn't help"
              className={`flex items-center gap-1 text-sm ${
                video.student_vote === 'downvote' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              {video.downvotes ?? 0}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillVideoPanel;
