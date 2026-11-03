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
  skillVideoAPI: { getForSkill: jest.fn() },
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

const axiosError = (message: string) => ({
  isAxiosError: true,
  response: { data: { error: 'Channel not found', message } },
});

const renderCurator = (courseId = 'c1') =>
  render(
    <MemoryRouter initialEntries={[`/skill-videos?courseId=${courseId}`]}>
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

  it('catches a repeat of a saved channel without calling the backend', async () => {
    getChannels.mockResolvedValue({ data: { channels: [{ channel_id: 'UC3b', name: '3Blue1Brown' }] } });
    renderCurator();
    await screen.findByText('3Blue1Brown');

    addChannel('@3blue1brown');
    addChannel('uc3b');

    expect(updateChannels).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledWith('That channel is already linked to this course.');
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
