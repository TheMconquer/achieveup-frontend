import { tierForScore, tierFromLabel, tierLabel } from './skillTiers';

// Thresholds mirror knowgap-backend/services/skill_tiers.py tier_for_score
// exactly (25/50/75/90) — this is the single shared scheme used by badge
// creation, badge-level lookups, and the progress-collection rebuild.
describe('tierForScore', () => {
  test.each([
    [0, 'developing'],
    [24, 'developing'],
    [25, 'beginner'],
    [49, 'beginner'],
    [50, 'intermediate'],
    [74, 'intermediate'],
    [75, 'advanced'],
    [89, 'advanced'],
    [90, 'expert'],
    [100, 'expert'],
  ])('%i%% -> %s', (score, expected) => {
    expect(tierForScore(score)).toBe(expected);
  });
});

describe('tierFromLabel', () => {
  test('recognizes each real tier label, case-insensitively', () => {
    expect(tierFromLabel('Expert')).toBe('expert');
    expect(tierFromLabel('ADVANCED')).toBe('advanced');
    expect(tierFromLabel('intermediate')).toBe('intermediate');
    expect(tierFromLabel('Beginner')).toBe('beginner');
    expect(tierFromLabel('Developing')).toBe('developing');
  });

  test('maps the API\'s "none" level to the "developing" tier', () => {
    expect(tierFromLabel('none')).toBe('developing');
  });

  test('falls back to "intermediate" for an unrecognized label', () => {
    expect(tierFromLabel('nonsense')).toBe('intermediate');
  });
});

describe('tierLabel', () => {
  test('has a display label for every tier', () => {
    expect(tierLabel.expert).toBe('Expert');
    expect(tierLabel.advanced).toBe('Advanced');
    expect(tierLabel.intermediate).toBe('Intermediate');
    expect(tierLabel.beginner).toBe('Beginner');
    expect(tierLabel.developing).toBe('Developing');
  });
});
