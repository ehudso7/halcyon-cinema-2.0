/**
 * StoryForge Content Generator
 * Core AI generation logic for narrative content
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  STORYFORGE_SYSTEM_PROMPT,
  buildGenerationPrompt,
  SEMANTIC_EXTRACTION_PROMPT,
  CANON_VALIDATION_PROMPT,
  buildCanonContextPrompt,
} from './prompts';
import type {
  GenerationRequest,
  GenerationResponse,
  CanonContext,
  CanonConflict,
  SemanticSceneData,
  StoryForgeConfig,
  DEFAULT_STORYFORGE_CONFIG,
} from '../types';

export class StoryForgeGenerator {
  private client: Anthropic;
  private config: StoryForgeConfig;

  constructor(config: Partial<StoryForgeConfig> = {}) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.config = { ...DEFAULT_STORYFORGE_CONFIG, ...config };
  }

  /**
   * Generate content based on request
   */
  async generate(
    request: GenerationRequest,
    canonContext: CanonContext,
    previousContent?: string
  ): Promise<GenerationResponse> {
    const startTime = Date.now();

    try {
      const prompt = buildGenerationPrompt(
        request.action,
        request.target,
        canonContext,
        {
          existingContent: request.existingContent,
          selectedText: request.selectedText,
          previousContent,
          instructions: request.userInstructions,
          wordCountTarget: request.wordCountTarget,
        }
      );

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        system: STORYFORGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const text = content.text;
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      // Check for canon conflict markers
      const { cleanContent, conflicts } = this.parseResponseForConflicts(text);

      return {
        success: true,
        content: cleanContent,
        tokensUsed,
        canonConflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      console.error('StoryForge generation error:', error);
      return {
        success: false,
        content: undefined,
        tokensUsed: 0,
        error: error instanceof Error ? error.message : 'Generation failed',
      };
    }
  }

  /**
   * Extract semantic data from scene content for Cinema translation
   */
  async extractSemanticData(
    sceneContent: string,
    canonContext: CanonContext
  ): Promise<SemanticSceneData> {
    try {
      const prompt = SEMANTIC_EXTRACTION_PROMPT.replace('{SCENE_CONTENT}', sceneContent);
      const canonPrompt = buildCanonContextPrompt(canonContext);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 2048,
        temperature: 0.3, // Lower temperature for more consistent extraction
        system: `You are a narrative analyst. Extract semantic information from scenes accurately and consistently. ${canonPrompt}`,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as SemanticSceneData;
    } catch (error) {
      console.error('Semantic extraction error:', error);
      // Return default semantic data on error
      return {
        purpose: null,
        emotionalBeat: null,
        conflict: null,
        resolution: null,
        characterStates: {},
        themes: [],
        mood: null,
        pacing: 'normal',
      };
    }
  }

  /**
   * Validate content against canon
   */
  async validateAgainstCanon(
    content: string,
    canonContext: CanonContext
  ): Promise<CanonConflict[]> {
    if (this.config.canonEnforcement === 'relaxed') {
      return [];
    }

    try {
      const prompt = CANON_VALIDATION_PROMPT
        .replace('{CONTENT}', content)
        .replace('{CANON}', buildCanonContextPrompt(canonContext));

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 2048,
        temperature: 0.2,
        system: 'You are a continuity editor. Identify canon conflicts precisely.',
        messages: [{ role: 'user', content: prompt }],
      });

      const responseContent = response.content[0];
      if (responseContent.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse JSON array from response
      const jsonMatch = responseContent.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const conflicts = JSON.parse(jsonMatch[0]) as CanonConflict[];

      // Filter by enforcement level
      if (this.config.canonEnforcement === 'moderate') {
        return conflicts.filter((c) => c.severity === 'error');
      }

      return conflicts;
    } catch (error) {
      console.error('Canon validation error:', error);
      return [];
    }
  }

  /**
   * Parse response for embedded conflict markers
   */
  private parseResponseForConflicts(text: string): {
    cleanContent: string;
    conflicts: CanonConflict[];
  } {
    const conflictMarker = '[CANON_CONFLICT]';
    const markerIndex = text.indexOf(conflictMarker);

    if (markerIndex === -1) {
      return { cleanContent: text.trim(), conflicts: [] };
    }

    // Extract conflicts JSON
    const afterMarker = text.substring(markerIndex + conflictMarker.length);
    const jsonMatch = afterMarker.match(/\[[\s\S]*?\]/);

    let conflicts: CanonConflict[] = [];
    let contentStart = markerIndex;

    if (jsonMatch) {
      try {
        conflicts = JSON.parse(jsonMatch[0]) as CanonConflict[];
        contentStart = markerIndex + conflictMarker.length + jsonMatch[0].length + jsonMatch.index!;
      } catch {
        // If JSON parsing fails, treat entire response as content
        contentStart = 0;
      }
    }

    const cleanContent = text.substring(contentStart).trim();

    return { cleanContent, conflicts };
  }

  /**
   * Generate chapter outline
   */
  async generateOutline(
    projectContext: {
      title: string;
      genre: string;
      logline?: string;
      existingChapters?: string[];
    },
    canonContext: CanonContext,
    instructions?: string
  ): Promise<GenerationResponse> {
    const prompt = `Generate a detailed chapter outline for "${projectContext.title}" (${projectContext.genre}).

${projectContext.logline ? `Logline: ${projectContext.logline}` : ''}

${projectContext.existingChapters?.length ? `Existing chapters: ${projectContext.existingChapters.join(', ')}` : 'This is the first chapter.'}

${instructions ? `Author's direction: ${instructions}` : ''}

Create an outline that includes:
- Chapter title
- Key scenes and their purposes
- Character arcs within the chapter
- Emotional progression
- Plot points to establish/develop
- Pacing notes

Format as structured markdown.`;

    return this.generate(
      {
        projectId: '',
        action: 'outline',
        target: 'chapter',
        userInstructions: prompt,
      },
      canonContext
    );
  }

  /**
   * Brainstorm ideas
   */
  async brainstorm(
    topic: string,
    canonContext: CanonContext,
    constraints?: string[]
  ): Promise<GenerationResponse> {
    const prompt = `Brainstorm creative ideas for: ${topic}

${constraints?.length ? `Constraints to consider:\n${constraints.map((c) => `- ${c}`).join('\n')}` : ''}

Generate 5-7 distinct ideas that:
- Respect all established canon
- Offer variety in approach
- Include both conventional and surprising options
- Consider reader engagement

Format as a numbered list with brief explanations for each idea.`;

    return this.generate(
      {
        projectId: '',
        action: 'brainstorm',
        target: 'chapter',
        userInstructions: prompt,
      },
      canonContext
    );
  }
}

// Singleton instance for server-side use
let generatorInstance: StoryForgeGenerator | null = null;

export function getStoryForgeGenerator(config?: Partial<StoryForgeConfig>): StoryForgeGenerator {
  if (!generatorInstance) {
    generatorInstance = new StoryForgeGenerator(config);
  }
  return generatorInstance;
}
