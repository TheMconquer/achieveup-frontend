import { tierForScore, tierFromLabel, tierLabel, isMastered } from './skillTiers';

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

describe('isMastered', () => {
  // Regression coverage for a bug that shipped silently: before the
  // beginner tier existed, 'developing' covered 0-49%, so callers wrote
  // `tierForScore(score) !== 'developing'` to mean "score >= 50%". Splitting
  // out beginner (25-49%) broke that at every inlined call site without
  // touching them, since beginner also satisfies `!== 'developing'`.
  test('a 30% (beginner-tier) score is not counted as mastered', () => {
    expect(isMastered(30)).toBe(false);
  });

  test.each([
    [0, false],
    [24, false],
    [25, false],
    [49, false],
    [50, true],
    [74, true],
    [75, true],
    [90, true],
    [100, true],
  ])('%i%% -> mastered: %s', (score, expected) => {
    expect(isMastered(score)).toBe(expected);
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
