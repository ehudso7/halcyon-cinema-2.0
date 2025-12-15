/**
 * Admin Metrics API
 * Endpoints for metrics dashboard (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getAggregatedMetrics,
  getDashboardWidgets,
  getEscalationFunnel,
} from '@/lib/metrics';

/**
 * GET /api/admin/metrics
 * Get aggregated metrics for admin dashboard
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Verify user is authenticated and is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status (would need admin flag in users table)
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  // For now, enterprise users can access admin metrics
  if (userData?.subscription_tier !== 'enterprise') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as 'day' | 'week' | 'month') || 'week';
  const view = searchParams.get('view') || 'overview';

  try {
    switch (view) {
      case 'overview': {
        const [metrics, widgets, funnel] = await Promise.all([
          getAggregatedMetrics(period),
          getDashboardWidgets(),
          getEscalationFunnel(),
        ]);

        return NextResponse.json({
          metrics,
          widgets,
          funnel,
        });
      }

      case 'metrics': {
        const metrics = await getAggregatedMetrics(period);
        return NextResponse.json(metrics);
      }

      case 'widgets': {
        const widgets = await getDashboardWidgets();
        return NextResponse.json(widgets);
      }

      case 'funnel': {
        const funnel = await getEscalationFunnel();
        return NextResponse.json(funnel);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid view parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
