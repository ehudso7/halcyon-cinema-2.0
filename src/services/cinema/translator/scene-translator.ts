/**
 * Scene to Shot Translator
 * Deterministic translation of narrative scenes to visual shots
 * IMPORTANT: This service ONLY uses the StoryForge public adapter
 */

import Anthropic from '@anthropic-ai/sdk';
import { getStoryForgeAdapter } from '@/modules/storyforge';
import { buildVisualPrompt, getTemplatesByFormat, applyTemplate } from '../prompts/templates';
import type {
  TranslationRequest,
  TranslationResponse,
  ShotDefinition,
  VisualStyle,
  ShotPreferences,
  DEFAULT_CINEMA_CONFIG,
} from '../types';
import type { ShotType, ProductionFormat } from '@/types/database';
import type { SemanticSceneData, CanonContext } from '@/modules/storyforge';
import { generateId } from '@/lib/utils';

// System prompt for shot generation
const SHOT_GENERATION_SYSTEM = `You are a professional cinematographer and film director. Your task is to translate narrative scenes into a sequence of visual shots.

For each scene, you will:
1. Analyze the narrative content and emotional beats
2. Determine the optimal shot sequence to convey the story visually
3. Specify shot types, camera movements, and compositions
4. Consider pacing and visual rhythm

Output your shot list as a JSON array with this structure:
[
  {
    "shotType": "establishing|wide|medium|close_up|extreme_close_up|over_shoulder|pov|aerial|tracking|dolly|pan|tilt|zoom|static",
    "description": "Detailed visual description of what we see",
    "composition": "Framing and composition notes",
    "cameraMovement": "Camera movement if any",
    "lighting": "Lighting description",
    "mood": "Emotional mood of the shot",
    "durationSeconds": 3.5,
    "characterIds": ["character-id-1"],
    "technicalNotes": "Any VFX or special requirements"
  }
]

Guidelines:
- Start with establishing shots for new locations
- Use shot variety to maintain visual interest
- Match shot intensity to emotional beats
- Consider the 180-degree rule for dialogue scenes
- Use close-ups for emotional moments
- Wide shots for action and geography
- Respect the production format (film vs TV vs animation)`;

export class SceneTranslator {
  private client: Anthropic;
  private storyforgeAdapter = getStoryForgeAdapter();

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Translate a scene into a shot sequence
   */
  async translateScene(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now();

    try {
      // If semantic data not provided, extract it
      let semanticData = request.semanticData;
      if (!semanticData || !semanticData.purpose) {
        semanticData = await this.storyforgeAdapter.extractSemanticData(
          request.sceneContent,
          request.canonContext
        );
      }

      // Build the translation prompt
      const prompt = this.buildTranslationPrompt(request, semanticData);

      // Generate shot list via AI
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.7,
        system: SHOT_GENERATION_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Parse shot list from response
      const shots = this.parseShotList(
        content.text,
        request.sceneId,
        request.projectId,
        request.format,
        request.aspectRatio || '16:9',
        request.visualStyle
      );

      // Apply shot preferences
      const filteredShots = this.applyPreferences(shots, request.shotPreferences);

      // Generate visual prompts for each shot
      const shotsWithPrompts = filteredShots.map((shot) =>
        this.generateVisualPrompt(shot, request.format, request.aspectRatio || '16:9', request.visualStyle)
      );

      return {
        success: true,
        shots: shotsWithPrompts,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      };
    } catch (error) {
      console.error('Scene translation error:', error);
      return {
        success: false,
        shots: [],
        error: error instanceof Error ? error.message : 'Translation failed',
        tokensUsed: 0,
      };
    }
  }

  /**
   * Build translation prompt
   */
  private buildTranslationPrompt(
    request: TranslationRequest,
    semanticData: SemanticSceneData
  ): string {
    const parts: string[] = [];

    // Scene content
    parts.push('## SCENE CONTENT\n' + request.sceneContent);

    // Semantic analysis
    parts.push('\n## SCENE ANALYSIS');
    if (semanticData.purpose) parts.push(`Purpose: ${semanticData.purpose}`);
    if (semanticData.emotionalBeat) parts.push(`Emotional Beat: ${semanticData.emotionalBeat}`);
    if (semanticData.conflict) parts.push(`Conflict: ${semanticData.conflict}`);
    if (semanticData.mood) parts.push(`Mood: ${semanticData.mood}`);
    if (semanticData.pacing) parts.push(`Pacing: ${semanticData.pacing}`);

    // Character states
    if (Object.keys(semanticData.characterStates).length > 0) {
      parts.push('\n## CHARACTER STATES');
      for (const [charId, state] of Object.entries(semanticData.characterStates)) {
        parts.push(`- Character ${charId}: ${state.emotion}, goal: ${state.goal}, tension: ${state.tension}/10`);
      }
    }

    // Canon context (characters and locations)
    parts.push('\n## AVAILABLE CHARACTERS');
    for (const char of request.canonContext.characters) {
      parts.push(`- ${char.name} (ID: ${char.id}): ${char.description || 'No description'}`);
    }

    parts.push('\n## AVAILABLE LOCATIONS');
    for (const loc of request.canonContext.locations) {
      parts.push(`- ${loc.name} (ID: ${loc.id}): ${loc.description || 'No description'}`);
    }

    // Format requirements
    parts.push(`\n## PRODUCTION FORMAT: ${request.format.toUpperCase()}`);
    parts.push(`Aspect Ratio: ${request.aspectRatio || '16:9'}`);

    // Instructions
    parts.push(`
## TASK
Generate a shot list for this scene. Consider:
- The emotional journey of the scene
- Character blocking and movement
- Visual storytelling that complements the narrative
- Production format constraints

Return ONLY a JSON array of shots. No other text.`);

    return parts.join('\n');
  }

  /**
   * Parse shot list from AI response
   */
  private parseShotList(
    responseText: string,
    sceneId: string,
    projectId: string,
    format: ProductionFormat,
    aspectRatio: string,
    visualStyle?: VisualStyle
  ): ShotDefinition[] {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('No JSON array found in response');
        return [];
      }

      const rawShots = JSON.parse(jsonMatch[0]) as Array<{
        shotType: ShotType;
        description: string;
        composition?: string;
        cameraMovement?: string;
        lighting?: string;
        mood?: string;
        durationSeconds?: number;
        characterIds?: string[];
        technicalNotes?: string;
      }>;

      return rawShots.map((raw, index) => ({
        id: generateId(),
        sceneId,
        orderIndex: index,
        shotType: raw.shotType || 'medium',
        description: raw.description,
        composition: raw.composition,
        cameraMovement: raw.cameraMovement,
        lighting: raw.lighting,
        mood: raw.mood,
        durationSeconds: raw.durationSeconds,
        characterIds: raw.characterIds || [],
        technicalNotes: raw.technicalNotes,
        vfxRequired: !!raw.technicalNotes?.toLowerCase().includes('vfx'),
        vfxNotes: raw.technicalNotes?.toLowerCase().includes('vfx') ? raw.technicalNotes : undefined,
        moodBoardUrls: [],
        format,
        aspectRatio,
        status: 'draft' as const,
      }));
    } catch (error) {
      console.error('Failed to parse shot list:', error);
      return [];
    }
  }

  /**
   * Apply user preferences to shot list
   */
  private applyPreferences(
    shots: ShotDefinition[],
    preferences?: ShotPreferences
  ): ShotDefinition[] {
    if (!preferences) return shots;

    let filtered = [...shots];

    // Filter by preferred shot types
    if (preferences.preferredShotTypes?.length) {
      // Don't remove shots, but we could reorder or weight them
    }

    // Filter out avoided shot types
    if (preferences.avoidShotTypes?.length) {
      filtered = filtered.filter(
        (s) => !preferences.avoidShotTypes!.includes(s.shotType)
      );
    }

    // Limit max shots
    if (preferences.maxShotsPerScene && filtered.length > preferences.maxShotsPerScene) {
      filtered = filtered.slice(0, preferences.maxShotsPerScene);
    }

    // Add establishing shot if requested and not present
    if (
      preferences.includeEstablishingShots &&
      !filtered.some((s) => s.shotType === 'establishing')
    ) {
      // This would need scene context to generate properly
    }

    return filtered;
  }

  /**
   * Generate visual prompt for a shot
   */
  private generateVisualPrompt(
    shot: ShotDefinition,
    format: ProductionFormat,
    aspectRatio: string,
    visualStyle?: VisualStyle
  ): ShotDefinition {
    // Generate prompt using template system
    const visualPrompt = buildVisualPrompt(
      {
        shotType: shot.shotType,
        description: shot.description,
        composition: shot.composition,
        lighting: shot.lighting,
        mood: shot.mood,
        cameraMovement: shot.cameraMovement,
      },
      format,
      aspectRatio,
      visualStyle
    );

    return {
      ...shot,
      visualPrompt,
    };
  }

  /**
   * Regenerate a single shot
   */
  async regenerateShot(
    shot: ShotDefinition,
    instructions: string,
    canonContext: CanonContext
  ): Promise<ShotDefinition | null> {
    try {
      const prompt = `Regenerate this shot with the following instructions:
${instructions}

Current shot:
- Type: ${shot.shotType}
- Description: ${shot.description}
- Mood: ${shot.mood || 'not specified'}

Return a single shot object in JSON format.`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0.8,
        system: SHOT_GENERATION_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const rawShot = JSON.parse(jsonMatch[0]);

      return {
        ...shot,
        shotType: rawShot.shotType || shot.shotType,
        description: rawShot.description || shot.description,
        composition: rawShot.composition,
        cameraMovement: rawShot.cameraMovement,
        lighting: rawShot.lighting,
        mood: rawShot.mood,
      };
    } catch (error) {
      console.error('Shot regeneration error:', error);
      return null;
    }
  }
}

// Singleton instance
let translatorInstance: SceneTranslator | null = null;

export function getSceneTranslator(): SceneTranslator {
  if (!translatorInstance) {
    translatorInstance = new SceneTranslator();
  }
  return translatorInstance;
}
