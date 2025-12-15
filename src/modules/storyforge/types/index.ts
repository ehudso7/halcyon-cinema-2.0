/**
 * StoryForge Types
 * Core type definitions for the StoryForge narrative engine
 */

import type {
  CanonCharacter,
  CanonLocation,
  CanonRule,
  CanonEvent,
  CanonTheme,
  CanonEntry,
  Chapter,
  Scene,
  Project,
  ConflictResolution,
} from '@/types/database';

// Generation action types
export type GenerationAction =
  | 'generate'
  | 'continue'
  | 'expand'
  | 'condense'
  | 'rewrite'
  | 'outline'
  | 'brainstorm';

export type GenerationTarget = 'chapter' | 'scene' | 'paragraph' | 'dialogue';

// Canon context for AI generation
export interface CanonContext {
  characters: CanonCharacterContext[];
  locations: CanonLocationContext[];
  rules: CanonRuleContext[];
  events: CanonEventContext[];
  themes: CanonThemeContext[];
}

export interface CanonCharacterContext {
  id: string;
  name: string;
  description: string | null;
  personality: string | null;
  backstory: string | null;
  relationships: unknown;
  locked: boolean;
}

export interface CanonLocationContext {
  id: string;
  name: string;
  description: string | null;
  atmosphere: string | null;
  locked: boolean;
}

export interface CanonRuleContext {
  id: string;
  name: string;
  description: string | null;
  constraints: string[];
  priority: number;
  locked: boolean;
}

export interface CanonEventContext {
  id: string;
  name: string;
  description: string | null;
  storyDate: string | null;
  consequences: string[];
  locked: boolean;
}

export interface CanonThemeContext {
  id: string;
  name: string;
  description: string | null;
  howExpressed: string | null;
  locked: boolean;
}

// Generation request
export interface GenerationRequest {
  projectId: string;
  action: GenerationAction;
  target: GenerationTarget;
  targetId?: string;

  // Content context
  existingContent?: string;
  selectedText?: string;
  cursorPosition?: number;

  // Specific instructions
  userInstructions?: string;
  tone?: string;
  style?: string;
  wordCountTarget?: number;

  // Context loading options
  loadCanon?: boolean;
  loadPreviousChapters?: number; // How many previous chapters to load
  loadPreviousScenes?: number;

  // Specific canon to emphasize
  emphasizeCharacters?: string[];
  emphasizeLocations?: string[];
  emphasizeRules?: string[];
}

// Generation response
export interface GenerationResponse {
  success: boolean;
  content?: string;
  tokensUsed: number;
  canonConflicts?: CanonConflict[];
  suggestions?: string[];
  error?: string;
}

// Canon conflict detection
export interface CanonConflict {
  id: string;
  type: 'character' | 'location' | 'rule' | 'event' | 'theme' | 'timeline';
  severity: 'warning' | 'error';
  description: string;
  conflictingCanonId: string;
  conflictingCanonName: string;
  suggestedResolution?: string;
  generatedText: string;
  position: {
    start: number;
    end: number;
  };
}

// Canon conflict resolution
export interface ConflictResolutionRequest {
  conflictId: string;
  resolution: ConflictResolution;
  // For 'update_canon'
  updatedCanonData?: unknown;
  // For 'fork_timeline'
  timelineName?: string;
  timelineDescription?: string;
}

// Semantic scene data (for cinema translation)
export interface SemanticSceneData {
  purpose: string | null;
  emotionalBeat: string | null;
  conflict: string | null;
  resolution: string | null;
  characterStates: Record<string, CharacterState>;
  themes: string[];
  mood: string | null;
  pacing: 'slow' | 'normal' | 'fast' | 'frenetic';
}

export interface CharacterState {
  characterId: string;
  emotion: string;
  goal: string;
  tension: number; // 0-10
}

// Writing session context
export interface WritingSession {
  projectId: string;
  project: Project;
  currentChapter?: Chapter;
  currentScene?: Scene;
  canonContext: CanonContext;
  recentGenerations: GenerationResponse[];
}

// Outline types
export interface ChapterOutline {
  title: string;
  summary: string;
  keyEvents: string[];
  charactersInvolved: string[];
  estimatedWordCount: number;
}

export interface SeriesOutline {
  title: string;
  logline: string;
  chapters: ChapterOutline[];
  mainCharacters: string[];
  mainThemes: string[];
}

// Voice and style
export interface WritingStyle {
  pov: 'first' | 'second' | 'third_limited' | 'third_omniscient';
  tense: 'past' | 'present';
  tone: string;
  vocabulary: 'simple' | 'moderate' | 'advanced' | 'literary';
  sentenceStructure: 'short' | 'varied' | 'complex';
  dialogueStyle: string;
}

// StoryForge adapter interface (public API for Cinema)
export interface StoryForgeAdapter {
  // Scene semantic extraction
  extractSemanticData(sceneContent: string, canonContext: CanonContext): Promise<SemanticSceneData>;

  // Canon operations
  loadCanonContext(projectId: string): Promise<CanonContext>;
  validateAgainstCanon(content: string, canonContext: CanonContext): Promise<CanonConflict[]>;

  // Generation operations (for authorized consumers only)
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

// Engine configuration
export interface StoryForgeConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  canonEnforcement: 'strict' | 'moderate' | 'relaxed';
  autoSaveInterval: number;
}

export const DEFAULT_STORYFORGE_CONFIG: StoryForgeConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.8,
  topP: 0.95,
  canonEnforcement: 'strict',
  autoSaveInterval: 30000,
};
