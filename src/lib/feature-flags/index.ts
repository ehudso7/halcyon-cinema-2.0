/**
 * Feature Flags System
 * Handles tier-based feature gating and subscription management
 */

import { createServerClient } from '@/lib/supabase/server';
import type { SubscriptionTier, User } from '@/types/database';

// Feature definitions
export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  requiredTiers: SubscriptionTier[];
  isCore: boolean; // Core features are always available
}

// All features in the system
export const FEATURES: Record<string, FeatureDefinition> = {
  // StoryForge Features (available to all tiers)
  storyforge_mode: {
    id: 'storyforge_mode',
    name: 'StoryForge Writing Mode',
    description: 'Full access to the StoryForge writing environment',
    requiredTiers: ['free', 'pro', 'studio', 'enterprise'],
    isCore: true,
  },
  ai_generation: {
    id: 'ai_generation',
    name: 'AI Content Generation',
    description: 'AI-assisted writing with continue, expand, rewrite features',
    requiredTiers: ['free', 'pro', 'studio', 'enterprise'],
    isCore: true,
  },
  canon_vault: {
    id: 'canon_vault',
    name: 'Canon Vault',
    description: 'Manage characters, locations, rules, and world-building',
    requiredTiers: ['free', 'pro', 'studio', 'enterprise'],
    isCore: true,
  },
  basic_export: {
    id: 'basic_export',
    name: 'Basic Exports',
    description: 'Export to DOCX and PDF formats',
    requiredTiers: ['free', 'pro', 'studio', 'enterprise'],
    isCore: true,
  },

  // Pro Features
  unlimited_projects: {
    id: 'unlimited_projects',
    name: 'Unlimited Projects',
    description: 'Create unlimited writing projects',
    requiredTiers: ['pro', 'studio', 'enterprise'],
    isCore: false,
  },
  advanced_exports: {
    id: 'advanced_exports',
    name: 'Advanced Exports',
    description: 'Export to EPUB, Fountain, and Markdown formats',
    requiredTiers: ['pro', 'studio', 'enterprise'],
    isCore: false,
  },
  unlimited_ai_tokens: {
    id: 'unlimited_ai_tokens',
    name: 'Unlimited AI Tokens',
    description: 'No monthly limit on AI generation',
    requiredTiers: ['pro', 'studio', 'enterprise'],
    isCore: false,
  },
  canon_locking: {
    id: 'canon_locking',
    name: 'Canon Locking',
    description: 'Lock canon entries to prevent changes',
    requiredTiers: ['pro', 'studio', 'enterprise'],
    isCore: false,
  },

  // Studio Features (Cinema Mode)
  cinema_mode: {
    id: 'cinema_mode',
    name: 'Cinema Mode',
    description: 'Access to cinematic visualization and shot generation',
    requiredTiers: ['studio', 'enterprise'],
    isCore: false,
  },
  shot_generation: {
    id: 'shot_generation',
    name: 'Shot Generation',
    description: 'AI-powered scene to shot translation',
    requiredTiers: ['studio', 'enterprise'],
    isCore: false,
  },
  visual_prompts: {
    id: 'visual_prompts',
    name: 'Visual Prompts',
    description: 'Generate prompts for AI image generation',
    requiredTiers: ['studio', 'enterprise'],
    isCore: false,
  },
  mood_boards: {
    id: 'mood_boards',
    name: 'Mood Boards',
    description: 'Create and manage visual mood boards',
    requiredTiers: ['studio', 'enterprise'],
    isCore: false,
  },
  pitch_decks: {
    id: 'pitch_decks',
    name: 'Pitch Decks',
    description: 'Generate pitch decks for your projects',
    requiredTiers: ['studio', 'enterprise'],
    isCore: false,
  },

  // Enterprise Features
  team_collaboration: {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Invite team members to collaborate on projects',
    requiredTiers: ['enterprise'],
    isCore: false,
  },
  api_access: {
    id: 'api_access',
    name: 'API Access',
    description: 'Programmatic access via REST API',
    requiredTiers: ['enterprise'],
    isCore: false,
  },
  custom_branding: {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'White-label exports with custom branding',
    requiredTiers: ['enterprise'],
    isCore: false,
  },
  priority_support: {
    id: 'priority_support',
    name: 'Priority Support',
    description: '24/7 priority customer support',
    requiredTiers: ['enterprise'],
    isCore: false,
  },
};

// Tier limits
export interface TierLimits {
  maxProjects: number;
  monthlyAiTokens: number;
  monthlyExports: number;
  maxCanonEntries: number;
  maxChaptersPerProject: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxProjects: 3,
    monthlyAiTokens: 50000,
    monthlyExports: 5,
    maxCanonEntries: 50,
    maxChaptersPerProject: 20,
  },
  pro: {
    maxProjects: -1, // Unlimited
    monthlyAiTokens: -1,
    monthlyExports: -1,
    maxCanonEntries: -1,
    maxChaptersPerProject: -1,
  },
  studio: {
    maxProjects: -1,
    monthlyAiTokens: -1,
    monthlyExports: -1,
    maxCanonEntries: -1,
    maxChaptersPerProject: -1,
  },
  enterprise: {
    maxProjects: -1,
    monthlyAiTokens: -1,
    monthlyExports: -1,
    maxCanonEntries: -1,
    maxChaptersPerProject: -1,
  },
};

/**
 * Check if a user has access to a feature
 */
export function hasFeature(userTier: SubscriptionTier, featureId: string): boolean {
  const feature = FEATURES[featureId];
  if (!feature) return false;
  if (feature.isCore) return true;
  return feature.requiredTiers.includes(userTier);
}

/**
 * Get all features available to a tier
 */
export function getTierFeatures(tier: SubscriptionTier): FeatureDefinition[] {
  return Object.values(FEATURES).filter(
    (feature) => feature.isCore || feature.requiredTiers.includes(tier)
  );
}

/**
 * Check if user can access cinema mode
 */
export function canAccessCinema(userTier: SubscriptionTier): boolean {
  return hasFeature(userTier, 'cinema_mode');
}

/**
 * Get limits for a tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if user is within limits
 */
export function isWithinLimits(
  user: User,
  limitType: keyof TierLimits,
  currentCount: number
): boolean {
  const limits = getTierLimits(user.subscription_tier);
  const limit = limits[limitType];
  if (limit === -1) return true; // Unlimited
  return currentCount < limit;
}

/**
 * Server-side feature check with database lookup
 */
export async function checkFeatureAccess(
  userId: string,
  featureId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  const supabase = createServerClient();

  // Get user's subscription tier
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { hasAccess: false, reason: 'User not found' };
  }

  // Check subscription status
  if (user.subscription_status !== 'active' && user.subscription_status !== 'trialing') {
    return { hasAccess: false, reason: 'Subscription not active' };
  }

  // Check feature access
  const hasAccess = hasFeature(user.subscription_tier, featureId);

  if (!hasAccess) {
    const feature = FEATURES[featureId];
    const lowestTier = feature?.requiredTiers[0];
    return {
      hasAccess: false,
      reason: `Requires ${lowestTier || 'higher'} tier or above`,
    };
  }

  return { hasAccess: true };
}

/**
 * Check if feature flag is enabled (database feature flags)
 */
export async function isFeatureFlagEnabled(
  flagName: string,
  userId?: string,
  userTier?: SubscriptionTier
): Promise<boolean> {
  const supabase = createServerClient();

  const { data: flag, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('name', flagName)
    .single();

  if (error || !flag) return false;
  if (!flag.enabled) return false;

  // Check user-specific override
  if (userId && flag.enabled_for_users.includes(userId)) {
    return true;
  }

  // Check tier access
  if (userTier && flag.enabled_for_tiers.includes(userTier)) {
    return true;
  }

  // Check rollout percentage
  if (flag.rollout_percentage >= 100) return true;
  if (flag.rollout_percentage <= 0) return false;

  // Deterministic rollout based on userId
  if (userId) {
    const hash = simpleHash(userId);
    return (hash % 100) < flag.rollout_percentage;
  }

  return false;
}

// Simple hash function for deterministic rollout
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
