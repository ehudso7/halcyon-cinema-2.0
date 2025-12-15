/**
 * Metrics Aggregator
 * Aggregates metrics for dashboards and reports
 */

import { createClient } from '@supabase/supabase-js';
import type {
  AggregatedMetrics,
  DashboardWidgetData,
  AlertThreshold,
} from './types';

/**
 * Get server-side Supabase client for aggregation
 */
function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get aggregated metrics for a time period
 */
export async function getAggregatedMetrics(
  period: 'day' | 'week' | 'month',
  endDate: Date = new Date()
): Promise<AggregatedMetrics> {
  const supabase = getServerClient();

  // Calculate start date
  const startDate = new Date(endDate);
  switch (period) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // Get active users (unique users with events in period)
  const { data: activeUsersData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const activeUsers = new Set(activeUsersData?.map((e) => e.user_id)).size;

  // Get new users
  const { count: newUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  // Get words written
  const { data: wordEvents } = await supabase
    .from('metrics_events')
    .select('properties')
    .eq('event_type', 'words_written')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const totalWordsWritten =
    wordEvents?.reduce(
      (sum, e) => sum + ((e.properties?.count as number) || 0),
      0
    ) || 0;

  // Get chapters created
  const { count: chaptersCreated } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'chapter_created')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  // Get canon metrics
  const { count: canonEntriesCreated } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'canon_entry_created')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const { count: conflictsDetected } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'canon_conflict_detected')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const { count: conflictsResolved } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'canon_conflict_resolved')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const conflictResolutionRate =
    (conflictsDetected || 0) > 0
      ? ((conflictsResolved || 0) / (conflictsDetected || 1)) * 100
      : 100;

  // Get cinema metrics
  const { count: cinemaActivations } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'cinema_mode_activated')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const { data: shotEvents } = await supabase
    .from('metrics_events')
    .select('properties')
    .eq('event_type', 'shot_generated')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const shotsGenerated =
    shotEvents?.reduce(
      (sum, e) => sum + ((e.properties?.shotCount as number) || 1),
      0
    ) || 0;

  const { count: pitchDecksCreated } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'pitch_deck_generated')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  // Get conversion metrics
  const { count: trialStarts } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'trial_started')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const { count: conversions } = await supabase
    .from('metrics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'upgrade_completed')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const conversionRate =
    (trialStarts || 0) > 0
      ? ((conversions || 0) / (trialStarts || 1)) * 100
      : 0;

  // Get MRR (simplified - would need billing integration)
  const { data: paidUsers } = await supabase
    .from('users')
    .select('subscription_tier')
    .in('subscription_tier', ['pro', 'studio', 'enterprise']);

  const tierPricing: Record<string, number> = {
    pro: 19,
    studio: 49,
    enterprise: 199, // Placeholder
  };

  const mrr =
    paidUsers?.reduce(
      (sum, u) => sum + (tierPricing[u.subscription_tier] || 0),
      0
    ) || 0;

  // Get error metrics
  const { data: errorEvents } = await supabase
    .from('metrics_events')
    .select('event_type')
    .eq('category', 'error')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const errorsByType: Record<string, number> = {};
  errorEvents?.forEach((e) => {
    errorsByType[e.event_type] = (errorsByType[e.event_type] || 0) + 1;
  });

  const totalErrors = errorEvents?.length || 0;

  // Calculate churn (simplified)
  const previousStart = new Date(startDate);
  switch (period) {
    case 'day':
      previousStart.setDate(previousStart.getDate() - 1);
      break;
    case 'week':
      previousStart.setDate(previousStart.getDate() - 7);
      break;
    case 'month':
      previousStart.setMonth(previousStart.getMonth() - 1);
      break;
  }

  const { data: previousActiveData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', startIso);

  const previousActiveUsers = new Set(previousActiveData?.map((e) => e.user_id));
  const currentActiveSet = new Set(activeUsersData?.map((e) => e.user_id));

  let churned = 0;
  previousActiveUsers.forEach((userId) => {
    if (!currentActiveSet.has(userId)) {
      churned++;
    }
  });

  return {
    period,
    startDate,
    endDate,
    activeUsers,
    newUsers: newUsers || 0,
    churned,
    totalWordsWritten,
    averageWordsPerUser:
      activeUsers > 0 ? totalWordsWritten / activeUsers : 0,
    chaptersCreated: chaptersCreated || 0,
    canonEntriesCreated: canonEntriesCreated || 0,
    conflictsDetected: conflictsDetected || 0,
    conflictResolutionRate,
    cinemaActivations: cinemaActivations || 0,
    shotsGenerated,
    pitchDecksCreated: pitchDecksCreated || 0,
    trialStarts: trialStarts || 0,
    conversions: conversions || 0,
    conversionRate,
    mrr,
    totalErrors,
    errorsByType,
  };
}

/**
 * Get dashboard widget data with comparison
 */
export async function getDashboardWidgets(): Promise<DashboardWidgetData[]> {
  const current = await getAggregatedMetrics('week');

  // Get previous period for comparison
  const previousEnd = new Date(current.startDate);
  const previous = await getAggregatedMetrics('week', previousEnd);

  const calculateChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const getDirection = (
    change: number
  ): 'up' | 'down' | 'flat' => {
    if (change > 1) return 'up';
    if (change < -1) return 'down';
    return 'flat';
  };

  return [
    {
      title: 'Active Writers',
      value: current.activeUsers,
      change: calculateChange(current.activeUsers, previous.activeUsers),
      changeDirection: getDirection(
        calculateChange(current.activeUsers, previous.activeUsers)
      ),
    },
    {
      title: 'Words Written',
      value: current.totalWordsWritten.toLocaleString(),
      change: calculateChange(
        current.totalWordsWritten,
        previous.totalWordsWritten
      ),
      changeDirection: getDirection(
        calculateChange(current.totalWordsWritten, previous.totalWordsWritten)
      ),
    },
    {
      title: 'Canon Entries',
      value: current.canonEntriesCreated,
      change: calculateChange(
        current.canonEntriesCreated,
        previous.canonEntriesCreated
      ),
      changeDirection: getDirection(
        calculateChange(current.canonEntriesCreated, previous.canonEntriesCreated)
      ),
    },
    {
      title: 'Cinema Activations',
      value: current.cinemaActivations,
      change: calculateChange(
        current.cinemaActivations,
        previous.cinemaActivations
      ),
      changeDirection: getDirection(
        calculateChange(current.cinemaActivations, previous.cinemaActivations)
      ),
    },
    {
      title: 'Conversion Rate',
      value: `${current.conversionRate.toFixed(1)}%`,
      change: current.conversionRate - previous.conversionRate,
      changeDirection: getDirection(
        current.conversionRate - previous.conversionRate
      ),
    },
    {
      title: 'MRR',
      value: `$${current.mrr.toLocaleString()}`,
      change: calculateChange(current.mrr, previous.mrr),
      changeDirection: getDirection(calculateChange(current.mrr, previous.mrr)),
    },
  ];
}

/**
 * Check alert thresholds and return triggered alerts
 */
export async function checkAlerts(
  thresholds: AlertThreshold[]
): Promise<Array<AlertThreshold & { currentValue: number }>> {
  const metrics = await getAggregatedMetrics('day');
  const triggeredAlerts: Array<AlertThreshold & { currentValue: number }> = [];

  const metricValues: Record<string, number> = {
    activeUsers: metrics.activeUsers,
    newUsers: metrics.newUsers,
    churned: metrics.churned,
    totalWordsWritten: metrics.totalWordsWritten,
    conflictsDetected: metrics.conflictsDetected,
    conflictResolutionRate: metrics.conflictResolutionRate,
    cinemaActivations: metrics.cinemaActivations,
    trialStarts: metrics.trialStarts,
    conversions: metrics.conversions,
    conversionRate: metrics.conversionRate,
    mrr: metrics.mrr,
    totalErrors: metrics.totalErrors,
  };

  for (const threshold of thresholds) {
    const currentValue = metricValues[threshold.metric];
    if (currentValue === undefined) continue;

    let triggered = false;
    switch (threshold.operator) {
      case 'gt':
        triggered = currentValue > threshold.value;
        break;
      case 'lt':
        triggered = currentValue < threshold.value;
        break;
      case 'eq':
        triggered = currentValue === threshold.value;
        break;
    }

    if (triggered) {
      triggeredAlerts.push({ ...threshold, currentValue });
    }
  }

  return triggeredAlerts;
}

/**
 * Get escalation funnel metrics
 */
export async function getEscalationFunnel(): Promise<{
  totalUsers: number;
  wroteContent: number;
  createdCanon: number;
  activatedCinema: number;
  generatedShots: number;
  convertedToPaid: number;
}> {
  const supabase = getServerClient();

  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Users who wrote content
  const { data: wroteData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .eq('event_type', 'words_written');

  const wroteContent = new Set(wroteData?.map((e) => e.user_id)).size;

  // Users who created canon
  const { data: canonData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .eq('event_type', 'canon_entry_created');

  const createdCanon = new Set(canonData?.map((e) => e.user_id)).size;

  // Users who activated cinema
  const { data: cinemaData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .eq('event_type', 'cinema_mode_activated');

  const activatedCinema = new Set(cinemaData?.map((e) => e.user_id)).size;

  // Users who generated shots
  const { data: shotData } = await supabase
    .from('metrics_events')
    .select('user_id')
    .eq('event_type', 'shot_generated');

  const generatedShots = new Set(shotData?.map((e) => e.user_id)).size;

  // Paid users
  const { count: convertedToPaid } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('subscription_tier', ['pro', 'studio', 'enterprise']);

  return {
    totalUsers: totalUsers || 0,
    wroteContent,
    createdCanon,
    activatedCinema,
    generatedShots,
    convertedToPaid: convertedToPaid || 0,
  };
}
