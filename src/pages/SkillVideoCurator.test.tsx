// These tests feed in javascript: links on purpose, to check they're never rendered.
/* eslint-disable no-script-url */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoTitle } from './SkillVideoCurator';
import { SkillVideo } from '../types';

// The page module imports the axios-based api client and auth context; mock
// them so Jest never has to load axios's ESM build. VideoTitle uses neither.
jest.mock('../services/api', () => ({ skillMatrixAPI: {}, skillVideoAPI: {} }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../hooks/useCourseList', () => ({ useCourseList: jest.fn() }));

const video = (overrides: Partial<SkillVideo>): SkillVideo => ({
  _id: 'v-1',
  course_id: '100',
  matrix_id: 'm-1',
  skill_name: 'Loops',
  title: 'Loops explained',
  link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  channel: 'CS Channel',
  thumbnail: '',
  source: 'manual',
  status: 'published',
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('VideoTitle', () => {
  test('links a YouTube video, with its start time', () => {
    render(<VideoTitle video={video({ timestamp_seconds: 90 })} />);
    expect(screen.getByRole('link', { name: /loops explained/i })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s'
    );
  });

  test('shows any other link as plain text', () => {
    render(<VideoTitle video={video({ link: 'javascript:alert(document.cookie)' })} />);
    expect(screen.getByText('Loops explained')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
