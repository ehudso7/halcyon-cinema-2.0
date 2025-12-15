import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getStoryForgeGenerator, getCanonManager } from '@/modules/storyforge';
import { checkFeatureAccess } from '@/lib/feature-flags';
import type { GenerationAction, GenerationTarget } from '@/modules/storyforge';

// POST /api/projects/[projectId]/generate - Generate content
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

    // Check feature access
    const { hasAccess, reason } = await checkFeatureAccess(user.id, 'ai_generation');
    if (!hasAccess) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      action,
      target,
      targetId,
      existingContent,
      selectedText,
      userInstructions,
      tone,
      style,
      wordCountTarget,
      emphasizeCharacters,
      emphasizeLocations,
      emphasizeRules,
    } = body;

    // Validate action and target
    const validActions: GenerationAction[] = ['generate', 'continue', 'expand', 'condense', 'rewrite', 'outline', 'brainstorm'];
    const validTargets: GenerationTarget[] = ['chapter', 'scene', 'paragraph', 'dialogue'];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!validTargets.includes(target)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    // Load canon context
    const canonManager = getCanonManager();
    const canonContext = await canonManager.loadCanonContext(params.projectId);

    // Load previous content for context
    let previousContent: string | undefined;
    if (targetId) {
      if (target === 'chapter') {
        const { data: chapter } = await supabase
          .from('chapters')
          .select('content')
          .eq('id', targetId)
          .single();
        previousContent = chapter?.content;
      } else if (target === 'scene') {
        const { data: scene } = await supabase
          .from('scenes')
          .select('content')
          .eq('id', targetId)
          .single();
        previousContent = scene?.content;
      }
    }

    // Generate content
    const generator = getStoryForgeGenerator();
    const startTime = Date.now();

    const result = await generator.generate(
      {
        projectId: params.projectId,
        action,
        target,
        targetId,
        existingContent,
        selectedText,
        userInstructions,
        tone,
        style,
        wordCountTarget,
        emphasizeCharacters,
        emphasizeLocations,
        emphasizeRules,
      },
      canonContext,
      previousContent
    );

    const latency = Date.now() - startTime;

    // Log generation
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      project_id: params.projectId,
      generation_type: action,
      target_type: target,
      target_id: targetId,
      prompt_used: userInstructions,
      input_context: { existingContent, selectedText },
      output_content: result.content,
      canon_loaded: canonContext,
      canon_conflicts_detected: result.canonConflicts,
      tokens_used: result.tokensUsed,
      model_used: 'claude-sonnet-4-20250514',
      latency_ms: latency,
      status: result.success ? 'completed' : 'failed',
      error_message: result.error,
    });

    // Update user token usage
    await supabase.rpc('increment_tokens_used', {
      p_user_id: user.id,
      p_tokens: result.tokensUsed,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      content: result.content,
      tokensUsed: result.tokensUsed,
      canonConflicts: result.canonConflicts,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
