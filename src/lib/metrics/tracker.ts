/**
 * Metrics Tracker
 * Core tracking service for metrics and analytics
 */

import { createBrowserClient } from '@supabase/ssr';
import type {
  MetricEvent,
  MetricCategory,
  MetricEventType,
  WritingDepthMetrics,
  CanonUsageMetrics,
  RetentionMetrics,
  EscalationMetrics,
} from './types';

// Session ID for grouping events
let sessionId: string | null = null;

// Event queue for batching
const eventQueue: MetricEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Configuration
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Generate a session ID
 */
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

/**
 * Get Supabase client for metrics
 */
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Track a metric event
 */
export function track(
  eventType: MetricEventType,
  category: MetricCategory,
  properties: Record<string, unknown> = {},
  userId?: string,
  projectId?: string
): void {
  const event: MetricEvent = {
    userId: userId || 'anonymous',
    projectId,
    category,
    eventType,
    properties,
    timestamp: new Date(),
    sessionId: getSessionId(),
  };

  eventQueue.push(event);

  // Flush if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flush();
  } else if (!flushTimeout) {
    // Schedule flush
    flushTimeout = setTimeout(flush, FLUSH_INTERVAL);
  }
}

/**
 * Flush events to database
 */
async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  const events = [...eventQueue];
  eventQueue.length = 0;

  try {
    const supabase = getSupabaseClient();

    // Insert events
    const { error } = await supabase.from('metrics_events').insert(
      events.map((e) => ({
        user_id: e.userId,
        project_id: e.projectId,
        category: e.category,
        event_type: e.eventType,
        properties: e.properties,
        session_id: e.sessionId,
        created_at: e.timestamp.toISOString(),
      }))
    );

    if (error) {
      console.error('Failed to flush metrics:', error);
      // Put events back in queue
      eventQueue.unshift(...events);
    }
  } catch (err) {
    console.error('Metrics flush error:', err);
    // Put events back in queue
    eventQueue.unshift(...events);
  }
}

// Convenience tracking functions
export const trackWriting = {
  wordsWritten: (userId: string, projectId: string, count: number) =>
    track('words_written', 'writing', { count }, userId, projectId),

  chapterCreated: (userId: string, projectId: string, chapterId: string) =>
    track('chapter_created', 'writing', { chapterId }, userId, projectId),

  sceneCreated: (userId: string, projectId: string, sceneId: string) =>
    track('scene_created', 'writing', { sceneId }, userId, projectId),

  aiGeneration: (
    userId: string,
    projectId: string,
    action: 'requested' | 'accepted' | 'rejected',
    tokens?: number
  ) =>
    track(
      `ai_generation_${action}` as MetricEventType,
      'writing',
      { tokens },
      userId,
      projectId
    ),

  sessionStart: (userId: string, projectId?: string) =>
    track('writing_session_start', 'writing', {}, userId, projectId),

  sessionEnd: (userId: string, projectId?: string, duration?: number) =>
    track('writing_session_end', 'writing', { duration }, userId, projectId),
};

export const trackCanon = {
  entryCreated: (
    userId: string,
    projectId: string,
    entryType: string,
    entryId: string
  ) =>
    track(
      'canon_entry_created',
      'canon',
      { entryType, entryId },
      userId,
      projectId
    ),

  entryUpdated: (userId: string, projectId: string, entryId: string) =>
    track('canon_entry_updated', 'canon', { entryId }, userId, projectId),

  conflictDetected: (
    userId: string,
    projectId: string,
    conflictType: string,
    severity: string
  ) =>
    track(
      'canon_conflict_detected',
      'canon',
      { conflictType, severity },
      userId,
      projectId
    ),

  conflictResolved: (
    userId: string,
    projectId: string,
    resolution: 'keep_canon' | 'update_canon' | 'fork_timeline'
  ) =>
    track(
      'canon_conflict_resolved',
      'canon',
      { resolution },
      userId,
      projectId
    ),

  timelineForked: (userId: string, projectId: string, forkId: string) =>
    track('timeline_forked', 'canon', { forkId }, userId, projectId),
};

export const trackCinema = {
  activated: (userId: string, projectId: string) =>
    track('cinema_mode_activated', 'cinema', {}, userId, projectId),

  shotGenerated: (userId: string, projectId: string, sceneId: string, shotCount: number) =>
    track(
      'shot_generated',
      'cinema',
      { sceneId, shotCount },
      userId,
      projectId
    ),

  pitchDeckCreated: (userId: string, projectId: string) =>
    track('pitch_deck_generated', 'cinema', {}, userId, projectId),

  moodBoardCreated: (userId: string, projectId: string) =>
    track('mood_board_created', 'cinema', {}, userId, projectId),
};

export const trackConversion = {
  trialStarted: (userId: string, tier: string) =>
    track('trial_started', 'conversion', { tier }, userId),

  upgradeInitiated: (userId: string, fromTier: string, toTier: string) =>
    track('upgrade_initiated', 'conversion', { fromTier, toTier }, userId),

  upgradeCompleted: (userId: string, tier: string, amount: number) =>
    track('upgrade_completed', 'conversion', { tier, amount }, userId),

  churnRisk: (userId: string, riskScore: number) =>
    track('churn_risk_detected', 'conversion', { riskScore }, userId),
};

export const trackError = {
  apiError: (userId: string, endpoint: string, error: string, statusCode?: number) =>
    track('api_error', 'error', { endpoint, error, statusCode }, userId),

  generationError: (userId: string, projectId: string, error: string) =>
    track('generation_error', 'error', { error }, userId, projectId),

  rateLimitHit: (userId: string, limit: string) =>
    track('rate_limit_hit', 'error', { limit }, userId),
};

export const trackPerformance = {
  pageLoad: (page: string, duration: number) =>
    track('page_load', 'performance', { page, duration }),

  apiLatency: (endpoint: string, duration: number) =>
    track('api_latency', 'performance', { endpoint, duration }),

  generationLatency: (model: string, duration: number, tokens: number) =>
    track('generation_latency', 'performance', { model, duration, tokens }),
};

/**
 * Get writing depth metrics for a user/project
 */
export async function getWritingDepthMetrics(
  userId: string,
  projectId: string
): Promise<WritingDepthMetrics | null> {
  const supabase = getSupabaseClient();

  // Get project stats
  const { data: project } = await supabase
    .from('projects')
    .select('word_count')
    .eq('id', projectId)
    .single();

  // Get chapter count
  const { count: chapterCount } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Get scene count
  const { count: sceneCount } = await supabase
    .from('scenes')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Get session metrics
  const { data: sessions } = await supabase
    .from('metrics_events')
    .select('properties, created_at')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .in('event_type', ['writing_session_start', 'writing_session_end'])
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate average session length
  let totalDuration = 0;
  let sessionCount = 0;
  const sessionStarts: Record<string, Date> = {};

  sessions?.forEach((event) => {
    if (event.properties?.sessionId) {
      const sid = event.properties.sessionId as string;
      if (event.properties.event_type === 'writing_session_start') {
        sessionStarts[sid] = new Date(event.created_at);
      } else if (sessionStarts[sid]) {
        const duration =
          new Date(event.created_at).getTime() - sessionStarts[sid].getTime();
        totalDuration += duration;
        sessionCount++;
        delete sessionStarts[sid];
      }
    }
  });

  const avgSessionLength =
    sessionCount > 0 ? totalDuration / sessionCount / 60000 : 0;

  // Get AI assistance ratio
  const { data: aiEvents } = await supabase
    .from('metrics_events')
    .select('properties')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('event_type', 'ai_generation_accepted');

  const aiWords =
    aiEvents?.reduce(
      (sum, e) => sum + ((e.properties?.tokens as number) || 0) / 4,
      0
    ) || 0;
  const totalWords = project?.word_count || 0;
  const aiRatio = totalWords > 0 ? aiWords / totalWords : 0;

  return {
    userId,
    projectId,
    totalWords,
    totalChapters: chapterCount || 0,
    totalScenes: sceneCount || 0,
    averageSessionLength: avgSessionLength,
    writingStreak: 0, // Would need more complex calculation
    aiAssistanceRatio: aiRatio,
    lastWritingSession: sessions?.[0]?.created_at
      ? new Date(sessions[0].created_at)
      : new Date(),
  };
}

/**
 * Get canon usage metrics for a project
 */
export async function getCanonUsageMetrics(
  userId: string,
  projectId: string
): Promise<CanonUsageMetrics | null> {
  const supabase = getSupabaseClient();

  // Get entry counts by type
  const tables = [
    'canon_characters',
    'canon_locations',
    'canon_rules',
    'canon_events',
    'canon_themes',
  ] as const;

  const counts: Record<string, number> = {};
  let totalEntries = 0;

  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    const key = table.replace('canon_', '');
    counts[key] = count || 0;
    totalEntries += count || 0;
  }

  // Get conflict metrics
  const { count: conflictsDetected } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('event_type', 'canon_conflict_detected');

  const { count: conflictsResolved } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('event_type', 'canon_conflict_resolved');

  const { count: timelineForks } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('event_type', 'timeline_forked');

  // Get locked entries count
  const { count: lockedCount } = await supabase
    .from('canon_entries')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .neq('lock_status', 'unlocked');

  return {
    userId,
    projectId,
    totalEntries,
    entriesByType: {
      characters: counts.characters || 0,
      locations: counts.locations || 0,
      rules: counts.rules || 0,
      events: counts.events || 0,
      themes: counts.themes || 0,
    },
    conflictsDetected: conflictsDetected || 0,
    conflictsResolved: conflictsResolved || 0,
    timelinesForks: timelineForks || 0,
    lockedEntries: lockedCount || 0,
    averageEntryDepth: 0, // Would need schema analysis
  };
}

/**
 * Get retention metrics for a user
 */
export async function getRetentionMetrics(
  userId: string
): Promise<RetentionMetrics | null> {
  const supabase = getSupabaseClient();

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', userId)
    .single();

  if (!user) return null;

  // Get last activity
  const { data: lastEvent } = await supabase
    .from('metrics_events')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get session count
  const { count: sessionCount } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'writing_session_start');

  // Get project count
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const signupDate = new Date(user.created_at);
  const lastActiveDate = lastEvent
    ? new Date(lastEvent.created_at)
    : signupDate;
  const now = new Date();

  const daysSinceSignup = Math.floor(
    (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceLastActive = Math.floor(
    (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate risk score (0-100)
  let riskScore = 0;
  if (daysSinceLastActive > 7) riskScore += 20;
  if (daysSinceLastActive > 14) riskScore += 30;
  if (daysSinceLastActive > 30) riskScore += 30;
  if ((sessionCount || 0) < 3) riskScore += 10;
  if ((projectCount || 0) < 1) riskScore += 10;

  return {
    userId,
    signupDate,
    lastActiveDate,
    daysSinceSignup,
    daysSinceLastActive,
    totalSessions: sessionCount || 0,
    totalProjects: projectCount || 0,
    isAtRisk: daysSinceLastActive > 14 || riskScore > 50,
    riskScore: Math.min(riskScore, 100),
  };
}

/**
 * Get escalation metrics for a user
 */
export async function getEscalationMetrics(
  userId: string
): Promise<EscalationMetrics | null> {
  const supabase = getSupabaseClient();

  // Check if user has activated cinema
  const { data: cinemaEvent } = await supabase
    .from('metrics_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('event_type', 'cinema_mode_activated')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  // Get user signup date
  const { data: user } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', userId)
    .single();

  // Get shots generated
  const { count: shotsGenerated } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'shot_generated');

  // Get pitch decks created
  const { count: pitchDecks } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'pitch_deck_generated');

  const hasActivated = !!cinemaEvent;
  let daysToEscalation: number | undefined;

  if (hasActivated && user) {
    const signupDate = new Date(user.created_at);
    const activationDate = new Date(cinemaEvent.created_at);
    daysToEscalation = Math.floor(
      (activationDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    userId,
    hasActivatedCinema: hasActivated,
    cinemaActivationDate: cinemaEvent
      ? new Date(cinemaEvent.created_at)
      : undefined,
    daysToEscalation,
    shotsGenerated: shotsGenerated || 0,
    pitchDecksCreated: pitchDecks || 0,
  };
}

// Export flush for cleanup
export { flush };
