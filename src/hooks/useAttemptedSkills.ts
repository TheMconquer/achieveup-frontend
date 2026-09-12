import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { canvasAPI, progressAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { summarizeCourseProgress, AttemptedSkill } from '../utils/courseSummary';

interface UseAttemptedSkillsResult {
  attemptedSkills: AttemptedSkill[];
  courses: CanvasCourse[];
  loading: boolean;
  loadError: boolean;
  reload: () => void;
}

// Shared by every student page that needs "every skill this student has attempted,
// across all their courses" (StudentSkills, StudentSkillVideos) so the fetch-and-summarize
// logic can't drift between them.
export function useAttemptedSkills(studentId: string | undefined): UseAttemptedSkillsResult {
  const [attemptedSkills, setAttemptedSkills] = useState<AttemptedSkill[]>([]);
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
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
          .getSkillProgress(studentId, course.id)
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
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { attemptedSkills, courses, loading, loadError, reload: load };
}
