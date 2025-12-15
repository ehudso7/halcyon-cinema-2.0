import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getCanonManager } from '@/modules/storyforge';
import type { CanonEntityType } from '@/types/database';

// GET /api/projects/[projectId]/canon - Get all canon entries
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

    // Verify project access
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CanonEntityType | null;

    // Load full canon context
    const canonManager = getCanonManager();
    const canon = await canonManager.loadCanonContext(params.projectId);

    // Filter by type if specified
    if (type) {
      const typeMap: Record<string, keyof typeof canon> = {
        character: 'characters',
        location: 'locations',
        rule: 'rules',
        event: 'events',
        theme: 'themes',
      };

      const key = typeMap[type];
      if (key) {
        return NextResponse.json({ [key]: canon[key] });
      }
    }

    return NextResponse.json({ canon });
  } catch (error) {
    console.error('GET /api/projects/[id]/canon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[projectId]/canon - Create canon entry
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project access
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entityType, name, description, entityData } = body;

    if (!entityType || !name) {
      return NextResponse.json(
        { error: 'Entity type and name are required' },
        { status: 400 }
      );
    }

    const validTypes: CanonEntityType[] = ['character', 'location', 'rule', 'event', 'theme', 'reference', 'item', 'relationship'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const canonManager = getCanonManager();
    const result = await canonManager.createEntry(params.projectId, entityType, {
      name,
      description,
      entityData: entityData || {},
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to create canon entry' }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/canon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
