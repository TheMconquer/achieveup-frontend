import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import StudentProgress from './StudentProgress';
import { canvasInstructorAPI, instructorAPI, badgeAPI } from '../services/api';
import { toast } from 'react-hot-toast';

jest.mock('../services/api', () => ({
  canvasInstructorAPI: { getInstructorCourses: jest.fn() },
  instructorAPI: { getCourseStudentAnalytics: jest.fn(), forceSyncCourse: jest.fn(), getSyncStatus: jest.fn() },
  badgeAPI: { getStudentEarnedBadges: jest.fn(), generateBadgeShareLink: jest.fn() },
}));

// StudentProgress.tsx dynamically imports this (`const { toast } = await
// import('react-hot-toast')`) and destructures the *named* export, not the
// default - the mock needs to provide both shapes.
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  toast: { success: jest.fn(), error: jest.fn() },
}));

const course = (id: string, name: string) => ({ id, name, code: `COP-${id}` });

const oneCourse = () =>
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: [course('c1', 'Data Structures')],
  } as any);

const student = (overrides: any = {}) => ({
  id: 's1',
  name: 'Jordan Miller',
  skillsMastered: 2,
  badgesEarned: 1,
  progress: 60,
  riskLevel: 'medium',
  skillBreakdown: {},
  ...overrides,
});

const analyticsWith = (students: any[], extra: any = {}) =>
  ({ data: { analytics: { students, skillDistribution: {}, averageScores: {}, ...extra } } }) as any;

const renderPage = () =>
  render(
    <MemoryRouter>
      <StudentProgress />
    </MemoryRouter>
  );

const syncStatus = (status: string, extra: any = {}) =>
  ({ data: { course_id: 'c1', status, ...extra } }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(syncStatus('idle'));
});

test('shows a loading spinner before courses resolve', () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockReturnValue(new Promise(() => {}));
  const { container } = renderPage();

  expect(container.querySelector('.animate-spin')).toBeInTheDocument();
});

test('with no courses, shows the "No Courses Found" state pointing at Settings', async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({ data: [] } as any);
  renderPage();

  await waitFor(() => expect(screen.getByText('No Courses Found')).toBeInTheDocument());
  expect(screen.getByText('Configure Canvas Token').closest('a')).toHaveAttribute('href', '/settings');
});

test('a courses-load failure shows the Canvas-integration error message', async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue(new Error('down'));
  renderPage();

  await waitFor(() =>
    expect(screen.getByText('Failed to load courses. Please check your Canvas integration.')).toBeInTheDocument()
  );
});

const CANVAS_DOWN = "Couldn't reach Canvas to load your courses. Canvas may be down; please try again in a few minutes.";

test('a Canvas outage (502 from the backend) shows the Canvas-unavailable banner, not "No Courses Found"', async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue({
    isAxiosError: true,
    response: { status: 502, data: { error: 'Failed to fetch instructor courses: 503', statusCode: 502 } },
  });
  renderPage();

  await waitFor(() => expect(screen.getByText(CANVAS_DOWN)).toBeInTheDocument());
  expect(screen.queryByText('No Courses Found')).not.toBeInTheDocument();
});

test('no response at all (network error) also shows the Canvas-unavailable banner', async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
  renderPage();

  await waitFor(() => expect(screen.getByText(CANVAS_DOWN)).toBeInTheDocument());
});

test('an error body returned with 200 shows the Canvas-unavailable banner instead of a blank page', async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockResolvedValue({
    data: { error: 'Failed to fetch instructor courses: 503', statusCode: 503 },
  } as any);
  renderPage();

  await waitFor(() => expect(screen.getByText(CANVAS_DOWN)).toBeInTheDocument());
  expect(screen.queryByText('No Courses Found')).not.toBeInTheDocument();
  expect(instructorAPI.getCourseStudentAnalytics).not.toHaveBeenCalled();
});

test("a 4xx courses error shows the backend's own message", async () => {
  jest.mocked(canvasInstructorAPI.getInstructorCourses).mockRejectedValue({
    isAxiosError: true,
    response: { status: 400, data: { message: 'No Canvas API token found for user' } },
  });
  renderPage();

  await waitFor(() => expect(screen.getByText('No Canvas API token found for user')).toBeInTheDocument());
});

test('auto-selects the first course and loads its student data', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(
    analyticsWith([student()])
  );
  renderPage();

  await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
  expect(instructorAPI.getCourseStudentAnalytics).toHaveBeenCalledWith('c1');
});

test('with a course selected but zero students, shows the "No Student Progress Data Yet" setup guide, not an error', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([]));
  renderPage();

  await waitFor(() => expect(screen.getByText('No Student Progress Data Yet')).toBeInTheDocument());
  expect(screen.queryByText(/Failed to load student data/)).not.toBeInTheDocument();
});

test('a 404 on student data shows the "no data found" message; other failures show the generic retry message', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  renderPage();

  await waitFor(() =>
    expect(
      screen.getByText('Failed to load student data. No data found for this course.')
    ).toBeInTheDocument()
  );
});

test('a non-404 failure on student data shows the generic retry message', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
  renderPage();

  await waitFor(() =>
    expect(screen.getByText('Failed to load student data. Please try again.')).toBeInTheDocument()
  );
});

test('shows only the top 3 skills per student, sorted by score descending', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(
    analyticsWith([
      student({
        skillBreakdown: {
          Lowest: { score: 10, level: 'beginner', questionsAttempted: 1, questionsCorrect: 0 },
          Second: { score: 70, level: 'intermediate', questionsAttempted: 2, questionsCorrect: 1 },
          Highest: { score: 95, level: 'advanced', questionsAttempted: 3, questionsCorrect: 3 },
          Third: { score: 50, level: 'intermediate', questionsAttempted: 2, questionsCorrect: 1 },
          Fourth: { score: 30, level: 'beginner', questionsAttempted: 1, questionsCorrect: 0 },
        },
      }),
    ])
  );
  renderPage();

  await waitFor(() => expect(screen.getByText('Highest')).toBeInTheDocument());
  expect(screen.queryByText('Fourth')).not.toBeInTheDocument();
  expect(screen.queryByText('Lowest')).not.toBeInTheDocument();

  // Sorted descending: Highest, then Second, then Third, in DOM order.
  // (`span.text-sm.font-medium` targets just the skill-name spans - the
  // level badges are also "font-medium" but text-xs, not text-sm.)
  const skillsCell = screen.getByText('Highest').closest('td')!;
  const renderedOrder = Array.from(skillsCell.querySelectorAll('span.text-sm.font-medium')).map(
    (el) => el.textContent
  );
  expect(renderedOrder).toEqual(['Highest', 'Second', 'Third']);
});

test('opening the Details modal shows the full skill breakdown, including a 0/0 accuracy guard', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(
    analyticsWith([
      student({
        skillBreakdown: {
          Untouched: { score: 0, level: 'beginner', questionsAttempted: 0, questionsCorrect: 0 },
          Attempted: { score: 75, level: 'intermediate', questionsAttempted: 4, questionsCorrect: 3 },
        },
      }),
    ])
  );
  renderPage();

  await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Details for Jordan Miller' }));

  const modal = within(screen.getByText('Jordan Miller - Detailed View').closest('.fixed')!);
  // 0 questionsAttempted must not divide-by-zero into NaN%.
  const untouchedRow = modal.getByText('Untouched').closest('div.border')!;
  expect(untouchedRow).toHaveTextContent('Accuracy: 0%');
  const attemptedRow = modal.getByText('Attempted').closest('div.border')!;
  expect(attemptedRow).toHaveTextContent('Accuracy: 75%');
});

test('closing the Details modal via its close button removes it', async () => {
  oneCourse();
  jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
  renderPage();

  await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Details for Jordan Miller' }));
  expect(screen.getByText('Jordan Miller - Detailed View')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByText('Jordan Miller - Detailed View')).not.toBeInTheDocument();
});

describe('Sync Now', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  test('blurs the data while the sync runs, then refreshes once when the backend says done', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockResolvedValue(
      { status: 202, data: { message: 'started', sync_status: syncStatus('running').data } } as any
    );
    renderPage();
    await screen.findByText('Jordan Miller');
    const callsBeforeSync = jest.mocked(instructorAPI.getCourseStudentAnalytics).mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });
    expect(screen.getByTestId('sync-overlay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();

    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(
      syncStatus('running', { quizzes_done: 2, quizzes_total: 8 })
    );
    await advance(2500);
    expect(screen.getByText('2 of 8 quizzes synced…')).toBeInTheDocument();
    // Data isn't reloaded while the sync runs, so partial scores never show.
    expect(jest.mocked(instructorAPI.getCourseStudentAnalytics).mock.calls.length).toBe(callsBeforeSync);

    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(syncStatus('done'));
    await advance(2500);
    expect(screen.queryByTestId('sync-overlay')).not.toBeInTheDocument();
    expect(jest.mocked(toast.success)).toHaveBeenCalledWith('Sync complete. Scores are up to date.');
    expect(jest.mocked(instructorAPI.getCourseStudentAnalytics).mock.calls.length).toBe(callsBeforeSync + 1);

    // Checking stops once the sync is done.
    const statusChecks = jest.mocked(instructorAPI.getSyncStatus).mock.calls.length;
    await advance(30000);
    expect(jest.mocked(instructorAPI.getSyncStatus).mock.calls.length).toBe(statusChecks);
  });

  test('a failed sync shows the backend error and removes the overlay', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockResolvedValue({ status: 202, data: {} } as any);
    renderPage();
    await screen.findByText('Jordan Miller');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });
    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(
      syncStatus('failed', { error: 'Canvas is down' })
    );
    await advance(2500);

    expect(jest.mocked(toast.error)).toHaveBeenCalledWith('Canvas is down');
    expect(screen.queryByTestId('sync-overlay')).not.toBeInTheDocument();
  });

  test('a sync already running (409) is watched instead of reported as an error', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockRejectedValue(
      { isAxiosError: true, response: { status: 409, data: { message: 'A sync for this course is already running.' } } }
    );
    renderPage();
    await screen.findByText('Jordan Miller');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });

    expect(screen.getByTestId('sync-overlay')).toBeInTheDocument();
    expect(jest.mocked(toast.error)).not.toHaveBeenCalled();
  });

  test('a sync already running when the page opens shows the overlay', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(syncStatus('running', { source: 'scheduled' }));
    renderPage();

    expect(await screen.findByTestId('sync-overlay')).toBeInTheDocument();
    expect(screen.getByText('Fetching quizzes from Canvas…')).toBeInTheDocument();
  });

  test('a long sync that keeps reporting progress keeps the overlay up', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockResolvedValue({ status: 202, data: {} } as any);
    renderPage();
    await screen.findByText('Jordan Miller');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });
    // Ten minutes of a sync whose heartbeat changes every minute.
    for (let elapsed = 0; elapsed <= 10 * 60 * 1000; elapsed += 2500) {
      const minute = Math.floor(elapsed / 60000);
      jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(
        syncStatus('running', { updated_at: `2026-10-27T12:${String(minute).padStart(2, '0')}:00Z` })
      );
      await advance(2500);
    }

    expect(screen.getByTestId('sync-overlay')).toBeInTheDocument();
    expect(jest.mocked(toast.error)).not.toHaveBeenCalled();
  });

  test('gives up when the status stops changing', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockResolvedValue({ status: 202, data: {} } as any);
    renderPage();
    await screen.findByText('Jordan Miller');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });
    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(
      syncStatus('running', { updated_at: '2026-10-27T12:00:00Z' })
    );
    for (let elapsed = 0; elapsed <= 6 * 60 * 1000; elapsed += 2500) {
      await advance(2500);
    }

    expect(screen.queryByTestId('sync-overlay')).not.toBeInTheDocument();
    expect(jest.mocked(toast.error)).toHaveBeenCalledWith(
      'The sync is taking longer than expected. Check back in a minute for the latest scores.'
    );
  });

  test('leaving the page stops checking the sync status', async () => {
    jest.useFakeTimers();
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockResolvedValue({ status: 202, data: {} } as any);
    const { unmount } = renderPage();
    await screen.findByText('Jordan Miller');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });
    jest.mocked(instructorAPI.getSyncStatus).mockResolvedValue(syncStatus('running'));
    const statusChecks = jest.mocked(instructorAPI.getSyncStatus).mock.calls.length;
    unmount();
    await advance(30000);

    expect(jest.mocked(instructorAPI.getSyncStatus).mock.calls.length).toBe(statusChecks);
  });

  test('a network error during sync shows a specific "check back later" message', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });

    await waitFor(() => {
      expect(jest.mocked(toast.error)).toHaveBeenCalledWith(
        'Connection timeout. The sync is likely still running in the background—please check back in a minute.'
      );
    });
  });

  test('a non-network sync error shows the generic failure message', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockRejectedValue(new Error('boom'));
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));
    });

    await waitFor(() => {
      expect(jest.mocked(toast.error)).toHaveBeenCalledWith('Failed to sync data. Please try again.');
    });
  });

  test('a rate-limited sync (429) shows the server\'s message instead of the generic failure', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(instructorAPI.forceSyncCourse).mockRejectedValue(
      { isAxiosError: true, response: { status: 429, data: { message: 'Too many requests. Please wait a moment and try again.' } } }
    );
    renderPage();

    await screen.findByText('Jordan Miller');

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => {
      expect(jest.mocked(toast.error)).toHaveBeenCalledWith('Too many requests. Please wait a moment and try again.');
    });
  });
});

describe('instructor badge view', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  test('a failed badge load shows the real backend error, not a generic one', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(badgeAPI.getStudentEarnedBadges).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Could not verify your Canvas enrollment right now. Please try again shortly.' } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jordan Miller'));

    await waitFor(() =>
      expect(
        screen.getByText('Could not verify your Canvas enrollment right now. Please try again shortly.')
      ).toBeInTheDocument()
    );
  });

  test('clicking a student name expands an inline, authenticated badge view scoped to the selected course', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(badgeAPI.getStudentEarnedBadges).mockResolvedValue({
      data: {
        student_id: 's1',
        total_badges: 1,
        badges: [
          {
            badge_id: 'b1',
            badge_name: 'Beginner in Loops',
            skill_name: 'Loops',
            badge_level: 'beginner',
            progress_percentage: 33,
            earned_at: '2026-08-01T00:00:00Z',
            course_id: 'c1',
            course_name: 'Data Structures',
          },
        ],
      },
    } as any);
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jordan Miller'));

    await waitFor(() => expect(screen.getByText('Loops')).toBeInTheDocument());
    expect(badgeAPI.getStudentEarnedBadges).toHaveBeenCalledWith('s1', 'c1');
  });

  test('clicking "Get Share Link" shows a copyable link for that student', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(badgeAPI.getStudentEarnedBadges).mockResolvedValue({
      data: { student_id: 's1', total_badges: 0, badges: [] },
    } as any);
    jest.mocked(badgeAPI.generateBadgeShareLink).mockResolvedValue({
      data: {
        message: 'Badge profile shared successfully',
        share_link: 'https://achieveup.ucf.edu/badges/share/xyz',
        share_id: 'xyz',
      },
    } as any);
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jordan Miller'));

    await waitFor(() => expect(screen.getByRole('button', { name: /get share link/i })).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get share link/i }));
    });

    expect(badgeAPI.generateBadgeShareLink).toHaveBeenCalledWith('s1', 'c1');
    expect(screen.getByDisplayValue('https://achieveup.ucf.edu/badges/share/xyz')).toBeInTheDocument();
  });

  test('a student who has opted out shows an error toast instead of a link', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(badgeAPI.getStudentEarnedBadges).mockResolvedValue({
      data: { student_id: 's1', total_badges: 0, badges: [] },
    } as any);
    jest.mocked(badgeAPI.generateBadgeShareLink).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'This student has opted out of badge sharing' } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jordan Miller'));

    await waitFor(() => expect(screen.getByRole('button', { name: /get share link/i })).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /get share link/i }));
    });

    await waitFor(() => {
      expect(jest.mocked(toast.error)).toHaveBeenCalledWith('This student has opted out of badge sharing');
    });
    expect(screen.queryByRole('button', { name: /^copy$/i })).not.toBeInTheDocument();
  });

  test('clicking the student name again collapses the badge view', async () => {
    oneCourse();
    jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
    jest.mocked(badgeAPI.getStudentEarnedBadges).mockResolvedValue({
      data: { student_id: 's1', total_badges: 0, badges: [] },
    } as any);
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jordan Miller'));
    await waitFor(() => expect(screen.getByRole('button', { name: /get share link/i })).toBeInTheDocument());

    fireEvent.click(screen.getByText('Jordan Miller'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /get share link/i })).not.toBeInTheDocument()
    );
  });

  describe('paging through a student\'s badges', () => {
    // Badges are named "Skill 1" ... "Skill N" so a test can say exactly
    // which ones should be on screen.
    const earnedBadges = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        badge_id: `b${i + 1}`,
        badge_name: `Beginner in Skill ${i + 1}`,
        skill_name: `Skill ${i + 1}`,
        badge_level: 'beginner',
        progress_percentage: 33,
        earned_at: '2026-08-01T00:00:00Z',
        course_id: 'c1',
        course_name: 'Data Structures',
      }));

    const openStudentWithBadges = async (count: number) => {
      oneCourse();
      jest.mocked(instructorAPI.getCourseStudentAnalytics).mockResolvedValue(analyticsWith([student()]));
      jest.mocked(badgeAPI.getStudentEarnedBadges).mockResolvedValue({
        data: { student_id: 's1', total_badges: count, badges: earnedBadges(count) },
      } as any);
      renderPage();

      await waitFor(() => expect(screen.getByText('Jordan Miller')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Jordan Miller'));
      // The share button renders while badges are still loading, so wait for
      // the badges themselves.
      await waitFor(() => expect(screen.getByText('Skill 1')).toBeInTheDocument());
    };

    const visibleSkills = () => screen.queryAllByText(/^Skill \d+$/).map((el) => el.textContent);

    test('shows five badges at a time and lets the instructor move through every page', async () => {
      await openStudentWithBadges(12);

      expect(visibleSkills()).toEqual(['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5']);
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      expect(visibleSkills()).toEqual(['Skill 6', 'Skill 7', 'Skill 8', 'Skill 9', 'Skill 10']);
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      // The last page only holds the remainder.
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      expect(visibleSkills()).toEqual(['Skill 11', 'Skill 12']);

      fireEvent.click(screen.getByRole('button', { name: /previous/i }));
      expect(visibleSkills()).toEqual(['Skill 6', 'Skill 7', 'Skill 8', 'Skill 9', 'Skill 10']);
    });

    test('cannot page past the first or last page', async () => {
      await openStudentWithBadges(7);

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    });

    test('shows no paging controls when every badge fits on one page', async () => {
      await openStudentWithBadges(5);

      expect(visibleSkills()).toHaveLength(5);
      expect(screen.queryByText(/^Page \d+ of \d+$/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    test('paging controls keep working after a share link is generated', async () => {
      await openStudentWithBadges(8);
      jest.mocked(badgeAPI.generateBadgeShareLink).mockResolvedValue({
        data: {
          message: 'Badge profile shared successfully',
          share_link: 'https://achieveupapp.com/badges/share/xyz',
          share_id: 'xyz',
        },
      } as any);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /get share link/i }));
      });
      expect(screen.getByDisplayValue('https://achieveupapp.com/badges/share/xyz')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /next/i }));

      expect(visibleSkills()).toEqual(['Skill 6', 'Skill 7', 'Skill 8']);
      // Paging must not throw away the link that was just generated.
      expect(screen.getByDisplayValue('https://achieveupapp.com/badges/share/xyz')).toBeInTheDocument();
    });
  });
});
