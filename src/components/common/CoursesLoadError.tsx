import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { CANVAS_UNAVAILABLE_MESSAGE } from '../../utils/apiError';

interface CoursesLoadErrorProps {
  /** Canvas (or the backend's link to it) is down, rather than a setup problem. */
  canvasUnavailable: boolean;
  onRetry: () => void;
}

/**
 * Shown in place of a course list that failed to load, so an outage isn't
 * mistaken for "you have no courses" or "your token is wrong".
 */
const CoursesLoadError: React.FC<CoursesLoadErrorProps> = ({ canvasUnavailable, onRetry }) => (
  <div
    role="alert"
    className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/40 sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <p className="text-sm text-red-700 dark:text-red-300">
        {canvasUnavailable ? (
          CANVAS_UNAVAILABLE_MESSAGE
        ) : (
          <>
            Couldn't load your courses from Canvas. Check your Canvas token in{' '}
            <Link to="/settings" className="font-medium underline">
              Settings
            </Link>
            , then try again.
          </>
        )}
      </p>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300"
    >
      <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
      Try again
    </button>
  </div>
);

export default CoursesLoadError;
