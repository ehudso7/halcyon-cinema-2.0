import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { isWithinLimits, getTierLimits } from '@/lib/feature-flags';
import type { ProjectInsert } from '@/types/database';

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mode) {
      query = query.eq('mode', mode);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data for tier limits
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check project limits
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_archived', false);

    const limits = getTierLimits(userData.subscription_tier);
    if (limits.maxProjects !== -1 && (projectCount || 0) >= limits.maxProjects) {
      return NextResponse.json(
        { error: `Project limit reached. Upgrade to create more projects.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, genre, mode, logline, targetWordCount } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate mode access
    if (mode === 'cinema' && !['studio', 'enterprise'].includes(userData.subscription_tier)) {
      return NextResponse.json(
        { error: 'Cinema mode requires Studio or Enterprise subscription' },
        { status: 403 }
      );
    }

    const projectData: ProjectInsert = {
      user_id: user.id,
      title,
      description,
      genre,
      logline,
      mode: mode || 'storyforge',
      target_word_count: targetWordCount,
    };

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
