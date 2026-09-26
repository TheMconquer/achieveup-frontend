export type SkillTier = 'expert' | 'advanced' | 'intermediate' | 'beginner' | 'developing';

// Mirrors knowgap-backend/services/skill_tiers.py tier_for_score exactly
// (Beginner 25%, Intermediate 50%, Advanced 75%, Expert 90%) — this is the
// one shared scheme; badge levels and progress levels from the API both use
// it, so don't invent different cutoffs here. "Developing" is this UI's name
// for the backend's 'none' bucket (below 25%, not yet a real skill attempt).
export const tierForScore = (score: number): SkillTier => {
  if (score >= 90) return 'expert';
  if (score >= 75) return 'advanced';
  if (score >= 50) return 'intermediate';
  if (score >= 25) return 'beginner';
  return 'developing';
};

export const isMastered = (score: number): boolean => {
  const tier = tierForScore(score);
  return tier !== 'developing' && tier !== 'beginner';
};

// badge_level / skill_progress.level come back from the API as loose
// strings, not the narrower SkillTier union, so normalize defensively.
export const tierFromLabel = (level: string): SkillTier => {
  const normalized = level.toLowerCase();
  if (
    normalized === 'expert' ||
    normalized === 'advanced' ||
    normalized === 'intermediate' ||
    normalized === 'beginner' ||
    normalized === 'developing'
  ) {
    return normalized;
  }
  if (normalized === 'none') return 'developing';
  return 'intermediate';
};

export const tierLabel: Record<SkillTier, string> = {
  expert: 'Expert',
  advanced: 'Advanced',
  intermediate: 'Intermediate',
  beginner: 'Beginner',
  developing: 'Developing',
};

export const tierTextClass: Record<SkillTier, string> = {
  expert: 'text-purple-600 dark:text-purple-400',
  advanced: 'text-blue-600 dark:text-blue-400',
  intermediate: 'text-green-600 dark:text-green-400',
  beginner: 'text-amber-600 dark:text-amber-400',
  developing: 'text-red-600 dark:text-red-400',
};

export const tierBarClass: Record<SkillTier, string> = {
  expert: 'bg-purple-600',
  advanced: 'bg-blue-600',
  intermediate: 'bg-green-600',
  beginner: 'bg-amber-600',
  developing: 'bg-red-600',
};

export const tierBgClass: Record<SkillTier, string> = {
  expert: 'bg-purple-50 dark:bg-purple-900/40',
  advanced: 'bg-blue-50 dark:bg-blue-900/40',
  intermediate: 'bg-green-50 dark:bg-green-900/40',
  beginner: 'bg-amber-50 dark:bg-amber-900/40',
  developing: 'bg-red-50 dark:bg-red-900/40',
};

export const tierGradientClass: Record<SkillTier, string> = {
  expert: 'bg-gradient-to-br from-purple-600 to-purple-700',
  advanced: 'bg-gradient-to-br from-blue-600 to-blue-700',
  intermediate: 'bg-gradient-to-br from-green-600 to-green-700',
  beginner: 'bg-gradient-to-br from-amber-600 to-amber-700',
  developing: 'bg-gradient-to-br from-red-600 to-red-700',
};
