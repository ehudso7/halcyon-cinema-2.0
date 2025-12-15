import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { checkFeatureAccess } from '@/lib/feature-flags';
import type { ExportFormat } from '@/types/database';

// POST /api/projects/[projectId]/export - Export project
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

    const body = await request.json();
    const { format, chapterIds, options } = body;

    // Validate format
    const validFormats: ExportFormat[] = ['docx', 'pdf', 'epub', 'fountain', 'markdown', 'json'];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    // Check feature access for advanced formats
    const advancedFormats: ExportFormat[] = ['epub', 'fountain'];
    if (advancedFormats.includes(format)) {
      const { hasAccess, reason } = await checkFeatureAccess(user.id, 'advanced_exports');
      if (!hasAccess) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
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

    // Get chapters
    let chaptersQuery = supabase
      .from('chapters')
      .select('*')
      .eq('project_id', params.projectId)
      .order('order_index');

    if (chapterIds && chapterIds.length > 0) {
      chaptersQuery = chaptersQuery.in('id', chapterIds);
    }

    const { data: chapters, error: chaptersError } = await chaptersQuery;

    if (chaptersError) {
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
    }

    // Create export record
    const fileName = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;

    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .insert({
        user_id: user.id,
        project_id: params.projectId,
        format,
        file_name: fileName,
        export_scope: chapterIds?.length ? 'chapters' : 'full',
        chapter_ids: chapterIds || [],
        options: options || {},
        status: 'processing',
      })
      .select()
      .single();

    if (exportError) {
      return NextResponse.json({ error: 'Failed to create export' }, { status: 500 });
    }

    // Generate export content based on format
    let content: string;
    let contentType: string;

    switch (format) {
      case 'markdown':
        content = generateMarkdown(project, chapters || []);
        contentType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify({ project, chapters }, null, 2);
        contentType = 'application/json';
        break;
      case 'fountain':
        content = generateFountain(project, chapters || []);
        contentType = 'text/plain';
        break;
      default:
        // For docx, pdf, epub - return processing status
        // These would be handled by a background job
        return NextResponse.json({
          exportId: exportRecord.id,
          status: 'processing',
          message: 'Export is being generated. Check back shortly.',
        });
    }

    // Update export record
    await supabase
      .from('exports')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_size_bytes: new Blob([content]).size,
      })
      .eq('id', exportRecord.id);

    // Update user export count
    await supabase
      .from('users')
      .update({ monthly_exports_used: supabase.rpc('increment', { x: 1 }) })
      .eq('id', user.id);

    // Return content directly for text-based formats
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for export generation

function generateMarkdown(
  project: { title: string; subtitle?: string; description?: string; genre?: string },
  chapters: Array<{ title: string; content: string; order_index: number }>
): string {
  const lines: string[] = [];

  // Title page
  lines.push(`# ${project.title}`);
  if (project.subtitle) lines.push(`## ${project.subtitle}`);
  lines.push('');
  if (project.description) {
    lines.push(project.description);
    lines.push('');
  }
  if (project.genre) {
    lines.push(`*Genre: ${project.genre}*`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // Chapters
  for (const chapter of chapters.sort((a, b) => a.order_index - b.order_index)) {
    lines.push(`## Chapter ${chapter.order_index + 1}: ${chapter.title}`);
    lines.push('');
    lines.push(chapter.content || '');
    lines.push('');
  }

  return lines.join('\n');
}

function generateFountain(
  project: { title: string },
  chapters: Array<{ title: string; content: string; order_index: number }>
): string {
  const lines: string[] = [];

  // Title page
  lines.push(`Title: ${project.title}`);
  lines.push('');
  lines.push('===');
  lines.push('');

  // Scenes (chapters as scenes)
  for (const chapter of chapters.sort((a, b) => a.order_index - b.order_index)) {
    lines.push(`INT. ${chapter.title.toUpperCase()} - DAY`);
    lines.push('');
    lines.push(chapter.content || '');
    lines.push('');
  }

  return lines.join('\n');
}
