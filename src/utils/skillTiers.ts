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
  expert: 'text-purple-600',
  advanced: 'text-blue-600',
  intermediate: 'text-green-600',
  beginner: 'text-amber-600',
  developing: 'text-red-600',
};

export const tierBarClass: Record<SkillTier, string> = {
  expert: 'bg-purple-600',
  advanced: 'bg-blue-600',
  intermediate: 'bg-green-600',
  beginner: 'bg-amber-600',
  developing: 'bg-red-600',
};

export const tierBgClass: Record<SkillTier, string> = {
  expert: 'bg-purple-50',
  advanced: 'bg-blue-50',
  intermediate: 'bg-green-50',
  beginner: 'bg-amber-50',
  developing: 'bg-red-50',
};

export const tierGradientClass: Record<SkillTier, string> = {
  expert: 'bg-gradient-to-br from-purple-600 to-purple-700',
  advanced: 'bg-gradient-to-br from-blue-600 to-blue-700',
  intermediate: 'bg-gradient-to-br from-green-600 to-green-700',
  beginner: 'bg-gradient-to-br from-amber-600 to-amber-700',
  developing: 'bg-gradient-to-br from-red-600 to-red-700',
};
