/**
 * Metrics Module
 * Public exports for metrics and monitoring system
 */

// Types
export type {
  MetricCategory,
  MetricEventType,
  MetricEvent,
  WritingDepthMetrics,
  CanonUsageMetrics,
  RetentionMetrics,
  EscalationMetrics,
  ConversionMetrics,
  AggregatedMetrics,
  DashboardWidgetData,
  AlertThreshold,
} from './types';

// Core tracking
export {
  track,
  flush,
  trackWriting,
  trackCanon,
  trackCinema,
  trackConversion,
  trackError,
  trackPerformance,
  getWritingDepthMetrics,
  getCanonUsageMetrics,
  getRetentionMetrics,
  getEscalationMetrics,
} from './tracker';

// Aggregation (server-side only)
export {
  getAggregatedMetrics,
  getDashboardWidgets,
  checkAlerts,
  getEscalationFunnel,
} from './aggregator';
