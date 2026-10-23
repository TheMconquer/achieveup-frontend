// These tests feed in javascript: links on purpose, to check they're never rendered.
/* eslint-disable no-script-url */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkillVideoPanel from './SkillVideoPanel';
import { skillVideoAPI } from '../../services/api';
import { SkillVideo } from '../../types';

jest.mock('../../services/api', () => ({
  skillVideoAPI: { getForSkill: jest.fn(), vote: jest.fn() },
}));

const video = (overrides: Partial<SkillVideo>): SkillVideo => ({
  _id: 'v-1',
  course_id: '100',
  matrix_id: 'm-1',
  skill_name: 'Loops',
  title: 'Loops explained',
  link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  channel: 'CS Channel',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  source: 'manual',
  status: 'published',
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('SkillVideoPanel', () => {
  test('only shows videos whose link is a YouTube link', async () => {
    (skillVideoAPI.getForSkill as jest.Mock).mockResolvedValue({
      data: {
        videos: [
          video({}),
          video({ _id: 'v-2', title: 'Bad link', link: 'javascript:alert(document.cookie)' }),
        ],
      },
    });
    render(<SkillVideoPanel courseId="100" skillName="Loops" />);

    const link = await screen.findByRole('link', { name: /loops explained/i });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(screen.queryByText('Bad link')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  test('adds https:// to an old link saved without it', async () => {
    (skillVideoAPI.getForSkill as jest.Mock).mockResolvedValue({
      data: {
        videos: [video({ link: 'www.youtube.com/watch?v=dQw4w9WgXcQ', timestamp_seconds: 90 })],
      },
    });
    render(<SkillVideoPanel courseId="100" skillName="Loops" />);

    expect(await screen.findByRole('link', { name: /loops explained/i })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s'
    );
  });

  test('hides a thumbnail that is not a web URL but keeps the video', async () => {
    (skillVideoAPI.getForSkill as jest.Mock).mockResolvedValue({
      data: { videos: [video({ thumbnail: 'javascript:alert(1)' })] },
    });
    render(<SkillVideoPanel courseId="100" skillName="Loops" />);

    expect(await screen.findByRole('link', { name: /loops explained/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('shows the empty state when no video has a YouTube link', async () => {
    (skillVideoAPI.getForSkill as jest.Mock).mockResolvedValue({
      data: { videos: [video({ link: 'javascript:alert(1)' })] },
    });
    render(<SkillVideoPanel courseId="100" skillName="Loops" />);

    expect(await screen.findByText(/no videos yet for this skill/i)).toBeInTheDocument();
  });

  test('still hides bad links after a failed vote reloads the list', async () => {
    (skillVideoAPI.getForSkill as jest.Mock)
      .mockResolvedValueOnce({ data: { videos: [video({})] } })
      .mockResolvedValueOnce({
        data: {
          videos: [
            video({ upvotes: 7 }),
            video({ _id: 'v-2', title: 'Bad link', link: 'javascript:alert(document.cookie)' }),
          ],
        },
      });
    (skillVideoAPI.vote as jest.Mock).mockRejectedValue(new Error('network'));
    render(<SkillVideoPanel courseId="100" skillName="Loops" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /this helped: loops explained \(0\)/i })
    );

    // The reloaded list (with 7 upvotes) replaces the optimistic one.
    expect(
      await screen.findByRole('button', { name: /this helped: loops explained \(7\)/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Bad link')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
