import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import SkillVideoCurator from './SkillVideoCurator';
import { courseChannelsAPI, skillMatrixAPI, skillVideoAPI } from '../services/api';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isInstructor: true }),
}));

jest.mock('../hooks/useCourseList', () => ({
  useCourseList: () => ({
    courses: [
      { id: 'c1', name: 'Course One', code: 'C1' },
      { id: 'c2', name: 'Course Two', code: 'C2' },
    ],
    loading: false,
  }),
}));

jest.mock('../services/api', () => ({
  MAX_COURSE_CHANNELS: 3,
  courseChannelsAPI: { get: jest.fn(), update: jest.fn() },
  skillMatrixAPI: { getAllByCourse: jest.fn() },
  skillVideoAPI: {
    getForSkill: jest.fn(),
    generateAiRecommendations: jest.fn(),
    add: jest.fn(),
    findRelevantMoment: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const getChannels = courseChannelsAPI.get as jest.Mock;
const updateChannels = courseChannelsAPI.update as jest.Mock;

const foo = { channel_id: 'UCfoo', name: 'Foo Channel' };
const bar = { channel_id: 'UCbar', name: 'Bar Channel' };
const baz = { channel_id: 'UCbaz', name: 'Baz Channel' };

type Settle = { resolve: (value: unknown) => void; reject: (reason: unknown) => void };

const axiosError = (message: string, status = 400) => ({
  isAxiosError: true,
  response: { status, data: { error: 'Channel not found', message } },
});

const renderCurator = (courseId = 'c1', query = '') =>
  render(
    <MemoryRouter initialEntries={[`/skill-videos?courseId=${courseId}${query}`]}>
      <SkillVideoCurator />
    </MemoryRouter>
  );

const addChannel = (value: string) => {
  fireEvent.change(screen.getByLabelText('Add a channel'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Channel' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  (skillMatrixAPI.getAllByCourse as jest.Mock).mockResolvedValue({ data: [] });
  (skillVideoAPI.getForSkill as jest.Mock).mockResolvedValue({ data: { videos: [] } });
});

describe('SkillVideoCurator preferred channels', () => {
  it('shows the saved channels once they load', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo] } });
    renderCurator();

    expect(await screen.findByText('Foo Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Add a channel')).toBeInTheDocument();
  });

  it('keeps adding locked after a failed load, and retries', async () => {
    getChannels.mockRejectedValueOnce(new Error('network'));
    renderCurator();

    expect(await screen.findByText("Couldn't load this course's saved channels.")).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a channel')).not.toBeInTheDocument();

    getChannels.mockResolvedValueOnce({ data: { channels: [foo] } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Foo Channel')).toBeInTheDocument();
    expect(updateChannels).not.toHaveBeenCalled();
  });

  it('shows why access was refused, without a retry that cannot help', async () => {
    getChannels.mockRejectedValue(axiosError('Course c1 was not found in Canvas.', 403));
    renderCurator();

    expect(await screen.findByText('Course c1 was not found in Canvas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add a channel')).not.toBeInTheDocument();
  });

  it('offers a retry with the backend message on a server error', async () => {
    getChannels.mockRejectedValue(axiosError('Canvas API returned error 500.', 502));
    renderCurator();

    expect(await screen.findByText('Canvas API returned error 500.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('sends the handle from a pasted channel URL', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [foo, bar] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    addChannel('https://www.youtube.com/@bar/videos');

    await screen.findByText('Bar Channel');
    expect(updateChannels).toHaveBeenCalledWith('c1', ['UCfoo', '@bar']);
  });

  it("ignores a load that finishes after the course changed", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    getChannels
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ data: { channels: [bar] } });
    renderCurator('c1');

    fireEvent.click(screen.getByRole('button', { name: '← Change course' }));
    fireEvent.click(screen.getByRole('button', { name: /Course Two/ }));
    expect(await screen.findByText('Bar Channel')).toBeInTheDocument();

    await act(async () => resolveFirst({ data: { channels: [foo] } }));
    expect(screen.queryByText('Foo Channel')).not.toBeInTheDocument();
    expect(getChannels).toHaveBeenLastCalledWith('c2');
  });

  it.each([
    ['succeeds', (settle: Settle) => settle.resolve({ data: { success: true, channels: [foo] } })],
    ['fails', (settle: Settle) => settle.reject(axiosError('Could not save'))],
  ])('ignores a save that %s after the course changed', async (_label, finish) => {
    const settle = {} as Settle;
    getChannels
      .mockResolvedValueOnce({ data: { channels: [] } })
      .mockResolvedValueOnce({ data: { channels: [bar] } });
    updateChannels.mockReturnValueOnce(
      new Promise((resolve, reject) => Object.assign(settle, { resolve, reject }))
    );
    renderCurator('c1');
    await screen.findByLabelText('Add a channel');

    addChannel('@foo');
    fireEvent.click(screen.getByRole('button', { name: '← Change course' }));
    fireEvent.click(screen.getByRole('button', { name: /Course Two/ }));
    expect(await screen.findByText('Bar Channel')).toBeInTheDocument();

    await act(async () => finish(settle));

    expect(screen.getByText('Bar Channel')).toBeInTheDocument();
    expect(screen.queryByText('Foo Channel')).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Add a channel')).not.toHaveFocus();
  });

  it('sends the existing channel IDs plus the new entry', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [foo, bar] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    addChannel(' @bar ');

    expect(await screen.findByText('Bar Channel')).toBeInTheDocument();
    expect(updateChannels).toHaveBeenCalledWith('c1', ['UCfoo', '@bar']);
    expect(toast.success).toHaveBeenCalledWith('Channel added');
    expect(screen.getByLabelText('Add a channel')).toHaveValue('');
  });

  it("shows the backend's detailed message and keeps what was typed on failure", async () => {
    getChannels.mockResolvedValue({ data: { channels: [] } });
    updateChannels.mockRejectedValue(axiosError("Couldn't find these YouTube channels: @typo"));
    renderCurator();

    await screen.findByLabelText('Add a channel');
    addChannel('@typo');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't find these YouTube channels: @typo")
    );
    expect(screen.getByLabelText('Add a channel')).toHaveValue('@typo');
  });

  it('catches a repeated channel ID or URL without calling the backend', async () => {
    const id = 'UCYO_jab_esuFRV4b17AJtAw';
    getChannels.mockResolvedValue({ data: { channels: [{ channel_id: id, name: '3Blue1Brown' }] } });
    renderCurator();
    await screen.findByText('3Blue1Brown');

    addChannel(id);
    addChannel(`https://www.youtube.com/channel/${id}`);

    expect(updateChannels).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledWith('That channel is already linked to this course.');
  });

  it("doesn't reject a handle for sharing a saved channel's display name", async () => {
    const math = { channel_id: 'UCmath', name: 'Math' };
    const other = { channel_id: 'UCother', name: 'Math Again' };
    getChannels.mockResolvedValue({ data: { channels: [math] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [math, other] } });
    renderCurator();
    await screen.findByText('Math');

    addChannel('@math');

    expect(await screen.findByText('Math Again')).toBeInTheDocument();
    expect(updateChannels).toHaveBeenCalledWith('c1', ['UCmath', '@math']);
  });

  it('says so when the backend drops the new entry as a duplicate', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [foo] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    addChannel('@foohandle');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('That channel is already linked to this course.')
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('hides the add box at the channel limit', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo, bar, baz] } });
    renderCurator();
    await screen.findByText('Baz Channel');

    expect(screen.queryByLabelText('Add a channel')).not.toBeInTheDocument();
    expect(screen.getByText(/maximum of 3 channels/)).toBeInTheDocument();
  });

  it('returns focus to the input after adding or removing a channel', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo] } });
    updateChannels
      .mockResolvedValueOnce({ data: { success: true, channels: [foo, bar] } })
      .mockResolvedValueOnce({ data: { success: true, channels: [foo] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    addChannel('@bar');
    await screen.findByText('Bar Channel');
    await waitFor(() => expect(screen.getByLabelText('Add a channel')).toHaveFocus());

    act(() => screen.getByLabelText('Add a channel').blur());
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bar Channel' }));
    await waitFor(() => expect(screen.queryByText('Bar Channel')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('Add a channel')).toHaveFocus());
  });

  it('moves focus to the limit note when the last slot is filled', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo, bar] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [foo, bar, baz] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    addChannel('@baz');

    const note = await screen.findByText(/maximum of 3 channels/);
    await waitFor(() => expect(note).toHaveFocus());
  });

  it('removes a channel by ID', async () => {
    getChannels.mockResolvedValue({ data: { channels: [foo, bar] } });
    updateChannels.mockResolvedValue({ data: { success: true, channels: [bar] } });
    renderCurator();
    await screen.findByText('Foo Channel');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Foo Channel' }));

    await waitFor(() => expect(screen.queryByText('Foo Channel')).not.toBeInTheDocument());
    expect(updateChannels).toHaveBeenCalledWith('c1', ['UCbar']);
  });
});

describe('SkillVideoCurator AI suggestions', () => {
  // A real YouTube link, since titles only render as links for YouTube URLs.
  const video = (id: string, source: string) => ({
    _id: id,
    title: id,
    link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    channel: '',
    source,
  });

  beforeEach(() => {
    getChannels.mockResolvedValue({ data: { channels: [] } });
  });

  it("reloads after generating so new picks appear in the backend's order", async () => {
    const getForSkill = skillVideoAPI.getForSkill as jest.Mock;
    getForSkill.mockResolvedValueOnce({ data: { videos: [video('Other pick', 'ai_suggested')] } });
    (skillVideoAPI.generateAiRecommendations as jest.Mock).mockResolvedValue({
      data: { videos: [video('Preferred pick', 'ai_suggested')] },
    });
    renderCurator('c1', '&skill=Algebra');
    await screen.findByText('Other pick');

    getForSkill.mockResolvedValueOnce({
      data: { videos: [video('Preferred pick', 'ai_suggested'), video('Other pick', 'ai_suggested')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Get AI Suggestions/ }));

    const preferred = await screen.findByText('Preferred pick');
    const other = screen.getByText('Other pick');
    expect(preferred.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getForSkill).toHaveBeenCalledTimes(2);
  });

  describe('with a skill dropdown', () => {
    const getForSkill = skillVideoAPI.getForSkill as jest.Mock;
    const generate = skillVideoAPI.generateAiRecommendations as jest.Mock;
    const titles = () =>
      screen.queryAllByRole('link').map((a) => a.textContent?.replace(' (opens in new tab)', ''));

    beforeEach(() => {
      (skillMatrixAPI.getAllByCourse as jest.Mock).mockResolvedValue({
        data: [{ _id: 'm1', matrix_name: 'Matrix', skills: ['Algebra', 'Logs'] }],
      });
      getForSkill.mockImplementation((course: string, _matrix: string, skill: string) =>
        Promise.resolve({ data: { videos: [video(`${course} ${skill}`, 'ai_suggested')] } })
      );
    });

    const renderWithMatrix = async () => {
      renderCurator('c1', '&matrixId=m1&skill=Algebra');
      await screen.findByText('c1 Algebra');
    };

    it('shows the selected skill when suggestions finish after it changed', async () => {
      let finish: (value: unknown) => void = () => {};
      generate.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderWithMatrix();

      fireEvent.click(screen.getByRole('button', { name: /Get AI Suggestions/ }));
      fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'Logs' } });
      await screen.findByText('c1 Logs');
      await act(async () => finish({ data: { videos: [video('New', 'ai_suggested')] } }));

      await waitFor(() => expect(getForSkill).toHaveBeenCalledTimes(3));
      await screen.findByText('c1 Logs');
      expect(titles()).toEqual(['c1 Logs']);
    });

    it('shows the selected course when suggestions finish after it changed', async () => {
      let finish: (value: unknown) => void = () => {};
      generate.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderWithMatrix();

      fireEvent.click(screen.getByRole('button', { name: /Get AI Suggestions/ }));
      fireEvent.click(screen.getByRole('button', { name: '← Change course' }));
      fireEvent.click(screen.getByRole('button', { name: /Course Two/ }));
      await screen.findByText('c2 Algebra');
      await act(async () => finish({ data: { videos: [video('New', 'ai_suggested')] } }));

      await waitFor(() => expect(getForSkill).toHaveBeenCalledTimes(3));
      await screen.findByText('c2 Algebra');
      expect(titles()).toEqual(['c2 Algebra']);
    });

    it('ignores a slow load that finishes after a newer one', async () => {
      let finishSlow: (value: unknown) => void = () => {};
      await renderWithMatrix();

      getForSkill.mockImplementationOnce(() => new Promise((resolve) => (finishSlow = resolve)));
      fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'Logs' } });
      await waitFor(() => expect(getForSkill).toHaveBeenCalledTimes(2));
      fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'Algebra' } });
      await screen.findByText('c1 Algebra');

      await act(async () => finishSlow({ data: { videos: [video('Slow', 'ai_suggested')] } }));

      expect(titles()).toEqual(['c1 Algebra']);
    });

    it('shows the selected skill when an added video finishes after it changed', async () => {
      let finish: (value: unknown) => void = () => {};
      (skillVideoAPI.add as jest.Mock).mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderWithMatrix();

      // Found by label, not hint text, so it still works when the hint changes.
      fireEvent.change(screen.getByLabelText('YouTube URL'), {
        target: { value: 'https://youtu.be/abc' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Video' }));
      fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'Logs' } });
      await screen.findByText('c1 Logs');
      await act(async () => finish({ data: {} }));

      await waitFor(() => expect(getForSkill).toHaveBeenCalledTimes(3));
      await screen.findByText('c1 Logs');
      expect(getForSkill).toHaveBeenLastCalledWith('c1', 'm1', 'Logs');
    });

    it.each([
      ['finding a moment', /Find relevant moment/, skillVideoAPI.findRelevantMoment],
      ['verifying', /Mark as instructor verified/, skillVideoAPI.verify],
    ])('keeps vote counts after %s', async (_label, button, action) => {
      const voted = { ...video('Voted', 'ai_suggested'), upvotes: 4, downvotes: 2 };
      getForSkill.mockResolvedValue({ data: { videos: [voted] } });
      (action as jest.Mock).mockResolvedValue({
        data: { ...video('Voted', 'ai_suggested'), instructor_verified: true, timestamp_seconds: 90 },
      });
      renderCurator('c1', '&matrixId=m1&skill=Algebra');
      await screen.findByText('Voted');

      fireEvent.click(screen.getByRole('button', { name: button }));

      await waitFor(() => expect(action).toHaveBeenCalled());
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(screen.getByText('4 found helpful · 2 did not')).toBeInTheDocument();
    });
  });

  it('skips the reload when there are no new suggestions', async () => {
    (skillVideoAPI.generateAiRecommendations as jest.Mock).mockResolvedValue({ data: { videos: [] } });
    renderCurator('c1', '&skill=Algebra');
    await waitFor(() => expect(skillVideoAPI.getForSkill).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Get AI Suggestions/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('No new suggestions found.'));
    expect(skillVideoAPI.getForSkill).toHaveBeenCalledTimes(1);
  });
});
