/**
 * Metrics Types
 * Type definitions for the metrics and monitoring system
 */

// Event categories for tracking
export type MetricCategory =
  | 'writing'      // Writing activity metrics
  | 'canon'        // Canon usage metrics
  | 'cinema'       // Cinema mode metrics
  | 'engagement'   // User engagement metrics
  | 'conversion'   // Subscription/upgrade metrics
  | 'error'        // Error and issue tracking
  | 'performance'; // System performance metrics

// Specific event types
export type MetricEventType =
  // Writing metrics
  | 'words_written'
  | 'chapter_created'
  | 'chapter_completed'
  | 'scene_created'
  | 'ai_generation_requested'
  | 'ai_generation_accepted'
  | 'ai_generation_rejected'
  | 'writing_session_start'
  | 'writing_session_end'
  // Canon metrics
  | 'canon_entry_created'
  | 'canon_entry_updated'
  | 'canon_entry_deleted'
  | 'canon_conflict_detected'
  | 'canon_conflict_resolved'
  | 'canon_locked'
  | 'canon_unlocked'
  | 'timeline_forked'
  // Cinema metrics
  | 'cinema_mode_activated'
  | 'shot_generated'
  | 'shot_edited'
  | 'mood_board_created'
  | 'pitch_deck_generated'
  | 'visual_prompt_exported'
  // Engagement metrics
  | 'project_created'
  | 'project_opened'
  | 'mode_switched'
  | 'export_requested'
  | 'feature_discovered'
  // Conversion metrics
  | 'trial_started'
  | 'upgrade_initiated'
  | 'upgrade_completed'
  | 'downgrade_requested'
  | 'churn_risk_detected'
  // Error metrics
  | 'api_error'
  | 'generation_error'
  | 'export_error'
  | 'auth_error'
  | 'rate_limit_hit'
  // Performance metrics
  | 'page_load'
  | 'api_latency'
  | 'generation_latency';

// Base event structure
export interface MetricEvent {
  id?: string;
  userId: string;
  projectId?: string;
  category: MetricCategory;
  eventType: MetricEventType;
  properties: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
}

// Writing depth metrics
export interface WritingDepthMetrics {
  userId: string;
  projectId: string;
  totalWords: number;
  totalChapters: number;
  totalScenes: number;
  averageSessionLength: number; // minutes
  writingStreak: number; // consecutive days
  aiAssistanceRatio: number; // % of words from AI
  lastWritingSession: Date;
}

// Canon usage metrics
export interface CanonUsageMetrics {
  userId: string;
  projectId: string;
  totalEntries: number;
  entriesByType: {
    characters: number;
    locations: number;
    rules: number;
    events: number;
    themes: number;
  };
  conflictsDetected: number;
  conflictsResolved: number;
  timelinesForks: number;
  lockedEntries: number;
  averageEntryDepth: number; // fields filled
}

// Retention metrics
export interface RetentionMetrics {
  userId: string;
  signupDate: Date;
  lastActiveDate: Date;
  daysSinceSignup: number;
  daysSinceLastActive: number;
  totalSessions: number;
  totalProjects: number;
  isAtRisk: boolean;
  riskScore: number; // 0-100
}

// Escalation metrics (StoryForge -> Cinema)
export interface EscalationMetrics {
  userId: string;
  hasActivatedCinema: boolean;
  cinemaActivationDate?: Date;
  daysToEscalation?: number;
  wordsBeforeEscalation?: number;
  projectsBeforeEscalation?: number;
  shotsGenerated: number;
  pitchDecksCreated: number;
}

// Conversion metrics
export interface ConversionMetrics {
  userId: string;
  currentTier: string;
  tierHistory: Array<{
    tier: string;
    startDate: Date;
    endDate?: Date;
  }>;
  trialStartDate?: Date;
  conversionDate?: Date;
  daysToConvert?: number;
  lifetimeValue: number;
  monthsSubscribed: number;
}

// Aggregated metrics for dashboards
export interface AggregatedMetrics {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;

  // User metrics
  activeUsers: number;
  newUsers: number;
  churned: number;

  // Writing metrics
  totalWordsWritten: number;
  averageWordsPerUser: number;
  chaptersCreated: number;

  // Canon metrics
  canonEntriesCreated: number;
  conflictsDetected: number;
  conflictResolutionRate: number;

  // Cinema metrics
  cinemaActivations: number;
  shotsGenerated: number;
  pitchDecksCreated: number;

  // Conversion metrics
  trialStarts: number;
  conversions: number;
  conversionRate: number;
  mrr: number;

  // Error metrics
  totalErrors: number;
  errorsByType: Record<string, number>;
}

// Dashboard widget data
export interface DashboardWidgetData {
  title: string;
  value: number | string;
  change: number; // percentage
  changeDirection: 'up' | 'down' | 'flat';
  sparkline?: number[];
}

// Alert thresholds
export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  notifyChannels: string[];
}
