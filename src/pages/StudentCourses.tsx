import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { canvasAPI, progressAPI } from '../services/api';
import { CanvasCourse } from '../types';
import { toast } from 'react-hot-toast';
import Card from '../components/common/Card';
import CourseOverviewGrid, {
  CourseOverviewSummary,
} from '../components/StudentPortal/CourseOverviewGrid';
import { summarizeCourseProgress } from '../utils/courseSummary';
import { AlertTriangle } from 'lucide-react';

const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const [courseSummaries, setCourseSummaries] = useState<CourseOverviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadCourses = useCallback(async () => {
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

    const progressResults = await Promise.all(
      courses.map((course) =>
        progressAPI
          .getSkillProgress(user.canvas_student_id!, course.id)
          .then((res) => ({ course, progress: res.data }))
          .catch(() => ({ course, progress: null }))
      )
    );

    setCourseSummaries(
      progressResults.map(({ course, progress }) => summarizeCourseProgress(course, progress).summary)
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

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
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">My Courses</h1>

        <p className="mt-1.5 text-sm text-gray-600">
          All of your Canvas courses and your mastery progress in each.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Some of your data couldn't be loaded from Canvas. Try refreshing the page.
        </div>
      )}

      <Card title="Courses">
        <CourseOverviewGrid courses={courseSummaries} />
      </Card>
    </div>
  );
};

export default StudentCourses;
