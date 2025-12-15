/**
 * StoryForge Prompt Templates
 * All prompts for AI-assisted writing operations
 */

import type {
  CanonContext,
  GenerationAction,
  GenerationTarget,
  WritingStyle,
  SemanticSceneData,
} from '../types';

// System prompt for StoryForge
export const STORYFORGE_SYSTEM_PROMPT = `You are StoryForge, an expert creative writing assistant embedded in the Halcyon Cinema platform. You help authors craft compelling narratives while respecting their creative vision and established canon.

CORE PRINCIPLES:
1. AUTHOR AUTHORITY: The author's decisions always take precedence. Never override their choices.
2. CANON RESPECT: Always honor established characters, locations, rules, events, and themes.
3. CONSISTENCY: Maintain narrative consistency across chapters and scenes.
4. CREATIVE ENHANCEMENT: Enhance the author's vision, don't replace it.
5. TRANSPARENCY: Always flag potential canon conflicts explicitly.

WRITING GUIDELINES:
- Match the author's established tone and style
- Maintain character voices consistently
- Respect world-building rules absolutely
- Preserve narrative continuity
- Avoid clichés unless intentionally used
- Show, don't tell (when appropriate)
- Create meaningful dialogue that reveals character
- Build tension appropriately for the pacing

When you detect a potential canon conflict, you MUST:
1. Clearly identify the conflict
2. Explain why it conflicts with established canon
3. Suggest alternatives that respect canon
4. NEVER silently change canon - always ask for author approval

Format your responses as requested. When generating content, output only the creative content unless analysis is specifically requested.`;

// Build canon context for prompt
export function buildCanonContextPrompt(canon: CanonContext): string {
  const parts: string[] = ['## ESTABLISHED CANON\n'];

  if (canon.characters.length > 0) {
    parts.push('### Characters');
    for (const char of canon.characters) {
      parts.push(`**${char.name}**${char.locked ? ' [LOCKED]' : ''}`);
      if (char.description) parts.push(`- Description: ${char.description}`);
      if (char.personality) parts.push(`- Personality: ${char.personality}`);
      if (char.backstory) parts.push(`- Backstory: ${char.backstory}`);
      parts.push('');
    }
  }

  if (canon.locations.length > 0) {
    parts.push('### Locations');
    for (const loc of canon.locations) {
      parts.push(`**${loc.name}**${loc.locked ? ' [LOCKED]' : ''}`);
      if (loc.description) parts.push(`- Description: ${loc.description}`);
      if (loc.atmosphere) parts.push(`- Atmosphere: ${loc.atmosphere}`);
      parts.push('');
    }
  }

  if (canon.rules.length > 0) {
    parts.push('### World Rules');
    for (const rule of canon.rules) {
      parts.push(`**${rule.name}** (Priority: ${rule.priority}/10)${rule.locked ? ' [LOCKED]' : ''}`);
      if (rule.description) parts.push(`- ${rule.description}`);
      if (rule.constraints.length > 0) {
        parts.push(`- Constraints: ${rule.constraints.join(', ')}`);
      }
      parts.push('');
    }
  }

  if (canon.events.length > 0) {
    parts.push('### Key Events');
    for (const event of canon.events) {
      parts.push(`**${event.name}**${event.locked ? ' [LOCKED]' : ''}`);
      if (event.description) parts.push(`- ${event.description}`);
      if (event.storyDate) parts.push(`- When: ${event.storyDate}`);
      if (event.consequences.length > 0) {
        parts.push(`- Consequences: ${event.consequences.join(', ')}`);
      }
      parts.push('');
    }
  }

  if (canon.themes.length > 0) {
    parts.push('### Themes');
    for (const theme of canon.themes) {
      parts.push(`**${theme.name}**${theme.locked ? ' [LOCKED]' : ''}`);
      if (theme.description) parts.push(`- ${theme.description}`);
      if (theme.howExpressed) parts.push(`- Expressed through: ${theme.howExpressed}`);
      parts.push('');
    }
  }

  return parts.join('\n');
}

// Build writing style instructions
export function buildStylePrompt(style?: WritingStyle): string {
  if (!style) return '';

  const parts: string[] = ['## WRITING STYLE\n'];

  const povMap = {
    'first': 'First person (I/we)',
    'second': 'Second person (you)',
    'third_limited': 'Third person limited',
    'third_omniscient': 'Third person omniscient',
  };

  parts.push(`- POV: ${povMap[style.pov]}`);
  parts.push(`- Tense: ${style.tense === 'past' ? 'Past tense' : 'Present tense'}`);
  parts.push(`- Tone: ${style.tone}`);
  parts.push(`- Vocabulary: ${style.vocabulary}`);
  parts.push(`- Sentence structure: ${style.sentenceStructure}`);
  if (style.dialogueStyle) parts.push(`- Dialogue style: ${style.dialogueStyle}`);

  return parts.join('\n');
}

// Generation prompts by action
export const ACTION_PROMPTS: Record<GenerationAction, (context: GenerationPromptContext) => string> = {
  generate: (ctx) => `Write new content for this ${ctx.target}.

${ctx.instructions ? `Author's instructions: ${ctx.instructions}\n` : ''}
${ctx.wordCountTarget ? `Target word count: approximately ${ctx.wordCountTarget} words\n` : ''}

${ctx.existingContent ? `Continue from this existing content:\n\n${ctx.existingContent}` : 'Start fresh.'}

Generate engaging, well-crafted prose that advances the narrative while respecting all established canon.`,

  continue: (ctx) => `Continue writing from where the author left off.

Current content:
${ctx.existingContent || '[Empty - start from the beginning]'}

${ctx.instructions ? `Author's instructions: ${ctx.instructions}\n` : ''}
${ctx.wordCountTarget ? `Write approximately ${ctx.wordCountTarget} more words.\n` : ''}

Continue the narrative naturally, maintaining voice, tone, and narrative momentum.`,

  expand: (ctx) => `Expand the following text with more detail and depth.

Text to expand:
${ctx.selectedText || ctx.existingContent}

${ctx.instructions ? `Author's instructions: ${ctx.instructions}\n` : ''}

Add sensory details, deeper characterization, and richer prose while preserving the original meaning and plot points.`,

  condense: (ctx) => `Condense the following text while preserving essential content.

Text to condense:
${ctx.selectedText || ctx.existingContent}

${ctx.instructions ? `Author's instructions: ${ctx.instructions}\n` : ''}

Tighten the prose, remove unnecessary words, and sharpen the impact while keeping the core narrative intact.`,

  rewrite: (ctx) => `Rewrite the following text with a fresh approach.

Text to rewrite:
${ctx.selectedText || ctx.existingContent}

${ctx.instructions ? `Author's instructions: ${ctx.instructions}\n` : ''}

Create a new version that achieves the same narrative goals but with improved prose, pacing, or impact.`,

  outline: (ctx) => `Create an outline for this ${ctx.target}.

${ctx.instructions ? `Author's vision: ${ctx.instructions}\n` : ''}
${ctx.existingContent ? `Existing context:\n${ctx.existingContent}\n` : ''}

Provide a structured outline with:
- Key plot points
- Character involvement
- Emotional beats
- Pacing notes

Format as a clear, bulleted outline.`,

  brainstorm: (ctx) => `Brainstorm ideas for this ${ctx.target}.

${ctx.instructions ? `Author's direction: ${ctx.instructions}\n` : ''}
${ctx.existingContent ? `Current context:\n${ctx.existingContent}\n` : ''}

Generate 5-7 creative ideas that:
- Respect established canon
- Advance the narrative
- Create interesting conflict or development
- Surprise the reader in satisfying ways

Format as a numbered list with brief explanations.`,
};

interface GenerationPromptContext {
  target: GenerationTarget;
  existingContent?: string;
  selectedText?: string;
  instructions?: string;
  wordCountTarget?: number;
}

// Build complete generation prompt
export function buildGenerationPrompt(
  action: GenerationAction,
  target: GenerationTarget,
  canon: CanonContext,
  context: {
    existingContent?: string;
    selectedText?: string;
    previousContent?: string;
    instructions?: string;
    wordCountTarget?: number;
    style?: WritingStyle;
  }
): string {
  const parts: string[] = [];

  // Add canon context
  const canonPrompt = buildCanonContextPrompt(canon);
  if (canonPrompt) parts.push(canonPrompt);

  // Add style guidelines
  if (context.style) {
    parts.push(buildStylePrompt(context.style));
  }

  // Add previous content for context
  if (context.previousContent) {
    parts.push(`## PREVIOUS CONTENT (for context)\n${context.previousContent}`);
  }

  // Add action-specific prompt
  const actionPrompt = ACTION_PROMPTS[action]({
    target,
    existingContent: context.existingContent,
    selectedText: context.selectedText,
    instructions: context.instructions,
    wordCountTarget: context.wordCountTarget,
  });
  parts.push(`## TASK\n${actionPrompt}`);

  // Add conflict detection instruction
  parts.push(`\n## IMPORTANT
Before generating, check for potential canon conflicts. If you detect ANY conflict with established canon:
1. Prefix your response with [CANON_CONFLICT] followed by a JSON array of conflicts
2. Each conflict should have: type, canonItem, description, suggestion
3. Then provide the content (or alternative suggestions)

If no conflicts, proceed directly with the requested content.`);

  return parts.join('\n\n');
}

// Semantic extraction prompt for Cinema translation
export const SEMANTIC_EXTRACTION_PROMPT = `Analyze this scene and extract semantic data for cinematic translation.

Scene content:
{SCENE_CONTENT}

Extract the following in JSON format:
{
  "purpose": "The narrative purpose of this scene (e.g., 'introduce conflict', 'character development', 'plot advancement')",
  "emotionalBeat": "The primary emotional beat (e.g., 'tension', 'revelation', 'reconciliation')",
  "conflict": "The central conflict in the scene, if any",
  "resolution": "How the scene resolves, if it does",
  "characterStates": {
    "[character_id]": {
      "characterId": "uuid",
      "emotion": "primary emotion",
      "goal": "what they want in this scene",
      "tension": 0-10
    }
  },
  "themes": ["theme1", "theme2"],
  "mood": "overall mood (e.g., 'ominous', 'hopeful', 'melancholic')",
  "pacing": "slow|normal|fast|frenetic"
}

Be precise and consistent with the established canon.`;

// Canon validation prompt
export const CANON_VALIDATION_PROMPT = `Analyze this content for canon consistency.

Content to validate:
{CONTENT}

Established Canon:
{CANON}

Check for:
1. Character behavior inconsistencies
2. Location description conflicts
3. World rule violations
4. Timeline inconsistencies
5. Theme contradictions

Return a JSON array of conflicts found:
[
  {
    "type": "character|location|rule|event|theme|timeline",
    "severity": "warning|error",
    "description": "Clear description of the conflict",
    "conflictingCanonId": "uuid of the conflicting canon entry",
    "conflictingCanonName": "name of the conflicting canon entry",
    "suggestedResolution": "how to fix it",
    "generatedText": "the specific text that conflicts",
    "position": { "start": 0, "end": 100 }
  }
]

If no conflicts found, return an empty array [].`;
