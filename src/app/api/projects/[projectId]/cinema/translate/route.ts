import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getSceneTranslator } from '@/services/cinema';
import { getCanonManager, getStoryForgeAdapter } from '@/modules/storyforge';
import { checkFeatureAccess } from '@/lib/feature-flags';
import type { ProductionFormat } from '@/types/database';

// POST /api/projects/[projectId]/cinema/translate - Translate scene to shots
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

    // Check cinema feature access
    const { hasAccess, reason } = await checkFeatureAccess(user.id, 'cinema_mode');
    if (!hasAccess) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Verify project access and mode
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.mode !== 'cinema') {
      return NextResponse.json(
        { error: 'Project must be in cinema mode to translate scenes' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      sceneId,
      sceneContent,
      format,
      aspectRatio,
      visualStyle,
      shotPreferences,
    } = body;

    if (!sceneId || !sceneContent) {
      return NextResponse.json(
        { error: 'Scene ID and content are required' },
        { status: 400 }
      );
    }

    // Load canon context
    const canonManager = getCanonManager();
    const canonContext = await canonManager.loadCanonContext(params.projectId);

    // Extract semantic data using StoryForge adapter
    const storyforgeAdapter = getStoryForgeAdapter();
    const semanticData = await storyforgeAdapter.extractSemanticData(sceneContent, canonContext);

    // Translate scene to shots
    const translator = getSceneTranslator();
    const result = await translator.translateScene({
      sceneId,
      projectId: params.projectId,
      sceneContent,
      semanticData,
      canonContext,
      format: (format as ProductionFormat) || project.production_format,
      aspectRatio: aspectRatio || '16:9',
      visualStyle,
      shotPreferences,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Save shots to database
    const shotsToInsert = result.shots.map((shot) => ({
      scene_id: sceneId,
      project_id: params.projectId,
      order_index: shot.orderIndex,
      shot_type: shot.shotType,
      duration_seconds: shot.durationSeconds,
      description: shot.description,
      composition: shot.composition,
      camera_movement: shot.cameraMovement,
      lighting: shot.lighting,
      visual_prompt: shot.visualPrompt,
      prompt_template: shot.promptTemplate,
      character_ids: shot.characterIds,
      location_id: shot.locationId,
      mood: shot.mood,
      emotional_beat: shot.emotionalBeat,
      technical_notes: shot.technicalNotes,
      vfx_required: shot.vfxRequired,
      vfx_notes: shot.vfxNotes,
      format: shot.format,
      aspect_ratio: shot.aspectRatio,
      status: 'draft',
    }));

    const { data: savedShots, error: saveError } = await supabase
      .from('shots')
      .insert(shotsToInsert)
      .select();

    if (saveError) {
      console.error('Failed to save shots:', saveError);
      // Return generated shots even if save failed
    }

    // Update scene shot count
    await supabase
      .from('scenes')
      .update({ shot_count: result.shots.length })
      .eq('id', sceneId);

    // Log generation
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      project_id: params.projectId,
      generation_type: 'shot_prompt',
      target_type: 'scene',
      target_id: sceneId,
      tokens_used: result.tokensUsed,
      model_used: 'claude-sonnet-4-20250514',
      status: 'completed',
    });

    return NextResponse.json({
      shots: savedShots || result.shots,
      tokensUsed: result.tokensUsed,
      semanticData,
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/cinema/translate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
