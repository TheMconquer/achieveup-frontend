import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkillMasteryList from './SkillMasteryList';

// SkillMasteryList pulls in SkillVideoPanel, which imports the real axios-based api
// client — mock it so Jest never has to transform axios's ESM build. None of the
// cases below have a courseId, so the video panel never actually mounts.
jest.mock('../../services/api', () => ({
  skillVideoAPI: { getForSkill: jest.fn().mockResolvedValue({ data: { videos: [] } }) },
}));

describe('SkillMasteryList', () => {
  test('shows an empty-state message when there are no skills', () => {
    render(<SkillMasteryList skills={[]} />);
    expect(screen.getByText(/your top skills will show up here/i)).toBeInTheDocument();
  });

  test('renders a row per skill with its score and tier label', () => {
    render(
      <SkillMasteryList
        skills={[
          { name: 'Recursion', score: 92 },
          { name: 'Loops', score: 40 },
        ]}
      />
    );

    expect(screen.getByText('Recursion')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();

    expect(screen.getByText('Loops')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });
});
