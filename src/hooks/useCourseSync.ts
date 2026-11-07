import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { instructorAPI } from '../services/api';
import { CourseSyncStatus } from '../types';

// How often to ask the backend whether the sync has finished.
export const SYNC_POLL_MS = 2500;
// Stop waiting if the status hasn't changed at all for this long. A running
// sync reports progress per quiz and a heartbeat every minute, so a long sync
// keeps the overlay up for as long as it's alive. The backend itself reports a
// sync with no heartbeat for 5 minutes as failed, so this only fires when the
// backend never says so.
export const SYNC_STALL_MS = 6 * 60 * 1000;
// Consecutive failed status checks before giving up.
const MAX_POLL_ERRORS = 3;

export type SyncOutcome = 'done' | 'failed' | 'timeout';

/**
 * Tracks a course's background Canvas sync. Asks the backend for the sync
 * status every few seconds while it runs, and calls onFinish once when it
 * ends. Also picks up a sync that was already running when the course was
 * selected (another tab, or the scheduled sync). Checking stops when the
 * course changes or the component unmounts.
 */
export function useCourseSync(
  courseId: string,
  onFinish: (outcome: SyncOutcome, status: CourseSyncStatus | null) => void
) {
  const [status, setStatus] = useState<CourseSyncStatus | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  // Bumped on course change/unmount so answers for an old course are ignored.
  const generationRef = useRef(0);

  const stopPolling = useCallback(() => {
    generationRef.current += 1;
    clearTimeout(timerRef.current);
  }, []);

  const startPolling = useCallback((forCourse: string) => {
    stopPolling();
    const generation = generationRef.current;
    let lastChangeAt = Date.now();
    let lastSeen = '';
    let errors = 0;

    const check = async () => {
      let latest: CourseSyncStatus | null = null;
      try {
        latest = (await instructorAPI.getSyncStatus(forCourse)).data;
        errors = 0;
      } catch (err) {
        console.error('Error checking sync status:', err);
        errors += 1;
      }
      if (generation !== generationRef.current) return;

      if (latest) {
        setStatus(latest);
        const seen = `${latest.status}|${latest.quizzes_done}|${latest.updated_at}`;
        if (seen !== lastSeen) {
          lastSeen = seen;
          lastChangeAt = Date.now();
        }
      }
      if (latest && latest.status !== 'running') {
        onFinishRef.current(latest.status === 'failed' ? 'failed' : 'done', latest);
        return;
      }
      if (errors >= MAX_POLL_ERRORS || Date.now() - lastChangeAt >= SYNC_STALL_MS) {
        setStatus(null);
        onFinishRef.current('timeout', latest);
        return;
      }
      timerRef.current = setTimeout(check, SYNC_POLL_MS);
    };

    timerRef.current = setTimeout(check, SYNC_POLL_MS);
  }, [stopPolling]);

  // On course change, show a sync that's already running.
  useEffect(() => {
    setStatus(null);
    if (!courseId) return undefined;

    const generation = generationRef.current;
    instructorAPI
      .getSyncStatus(courseId)
      .then((res) => {
        if (generation !== generationRef.current) return;
        setStatus(res.data);
        if (res.data.status === 'running') startPolling(courseId);
      })
      .catch((err) => console.error('Error checking sync status:', err));

    return stopPolling;
  }, [courseId, startPolling, stopPolling]);

  /** Start a sync of the current course. A 409 (already running) just
   * starts watching that sync; other errors are thrown to the caller. */
  const startSync = useCallback(async () => {
    const forCourse = courseId;
    const generation = generationRef.current;
    let started: CourseSyncStatus;
    try {
      const response = await instructorAPI.forceSyncCourse(forCourse);
      started = response.data.sync_status ?? { course_id: forCourse, status: 'running' };
    } catch (err) {
      if (!(axios.isAxiosError(err) && err.response?.status === 409)) throw err;
      started = { course_id: forCourse, status: 'running' };
    }
    // The course changed while the request was in flight.
    if (generation !== generationRef.current) return;
    setStatus(started);
    startPolling(forCourse);
  }, [courseId, startPolling]);

  return {
    status,
    running: status?.status === 'running',
    startSync,
  };
}
