import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Routes that only exist in the student portal. Visiting one of these puts a
// dual-role account into student view.
const STUDENT_ONLY_PATH_PREFIXES = [
  '/student-dashboard',
  '/courses',
  '/skills',
  '/badges',
  '/my-skill-videos',
];

// Routes that only exist in the instructor portal. Visiting one of these puts
// a dual-role account back into instructor view.
const INSTRUCTOR_ONLY_PATH_PREFIXES = [
  '/instructor-dashboard',
  '/skill-matrix',
  '/skill-assignment',
  '/skill-videos',
  '/progress',
];

type ViewMode = 'student' | 'instructor';

const storageKey = (userId: string) => `achieveup:view-mode:${userId}`;

function readStoredViewMode(userId: string): ViewMode | null {
  try {
    const value = sessionStorage.getItem(storageKey(userId));
    return value === 'student' || value === 'instructor' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredViewMode(userId: string, mode: ViewMode): void {
  try {
    sessionStorage.setItem(storageKey(userId), mode);
  } catch {
    // Storage unavailable (private mode etc.) - shared pages just fall back to instructor view.
  }
}

/**
 * Which portal a dual-role account (instructor with has_student_access) is
 * currently in. Role-specific routes decide it outright; shared routes like
 * /settings keep whichever view the user was last in, so opening Settings
 * from the student view doesn't flip them back to the instructor view.
 *
 * This is display logic only. Accounts that can't switch always get their
 * real role, so nothing stored here can widen what a plain student sees, and
 * the backend enforces roles regardless.
 */
export function useViewMode() {
  const { user, isInstructor } = useAuth();
  const { pathname } = useLocation();

  const canSwitchToStudentView = isInstructor && !!user?.has_student_access;

  let routeMode: ViewMode | null = null;
  if (STUDENT_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    routeMode = 'student';
  } else if (INSTRUCTOR_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    routeMode = 'instructor';
  }

  const userId = user?.id;
  const mode: ViewMode =
    routeMode ??
    (canSwitchToStudentView && userId ? readStoredViewMode(userId) : null) ??
    'instructor';

  useEffect(() => {
    if (canSwitchToStudentView && userId && routeMode) {
      writeStoredViewMode(userId, routeMode);
    }
  }, [canSwitchToStudentView, userId, routeMode]);

  const viewingAsStudent = canSwitchToStudentView && mode === 'student';
  const displayAsInstructor = isInstructor && !viewingAsStudent;

  return { canSwitchToStudentView, viewingAsStudent, displayAsInstructor };
}
