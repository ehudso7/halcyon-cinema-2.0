import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { ProjectUpdate } from '@/types/database';

// GET /api/projects/[projectId] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        chapters:chapters(id, title, order_index, word_count, status),
        canon_entries:canon_entries(id, name, entity_type, lock_status)
      `)
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[projectId] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('projects')
      .select('user_id, mode')
      .eq('id', params.projectId)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: ProjectUpdate = {};

    // Allowed update fields
    const allowedFields = [
      'title', 'subtitle', 'description', 'genre', 'logline',
      'target_word_count', 'status', 'cover_image_url', 'color_scheme', 'settings'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    // Handle mode switch separately (requires validation)
    if (body.mode && body.mode !== existing.mode) {
      // Get user tier
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (body.mode === 'cinema' && !['studio', 'enterprise'].includes(userData?.subscription_tier || '')) {
        return NextResponse.json(
          { error: 'Cinema mode requires Studio or Enterprise subscription' },
          { status: 403 }
        );
      }

      updates.mode = body.mode;
      if (body.mode === 'cinema' && !existing.mode) {
        updates.cinema_enabled_at = new Date().toISOString();
      }
    }

    updates.last_edited_at = new Date().toISOString();

    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', params.projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[projectId] - Delete (archive) project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete (archive)
    const { error } = await supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('id', params.projectId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
