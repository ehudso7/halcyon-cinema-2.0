/**
 * Cinema Service Types
 * Type definitions for cinematic visualization
 */

import type { ShotType, ProductionFormat, ContentStatus } from '@/types/database';
import type { SemanticSceneData, CanonContext } from '@/modules/storyforge';

// Shot definition
export interface ShotDefinition {
  id: string;
  sceneId: string;
  orderIndex: number;
  shotType: ShotType;
  durationSeconds?: number;

  // Visual description
  description: string;
  composition?: string;
  cameraMovement?: string;
  lighting?: string;

  // Generated prompt
  visualPrompt?: string;
  promptTemplate?: string;

  // References
  characterIds: string[];
  locationId?: string;

  // Mood and emotion
  mood?: string;
  emotionalBeat?: string;

  // Technical
  technicalNotes?: string;
  vfxRequired: boolean;
  vfxNotes?: string;

  // Preview
  previewImageUrl?: string;
  moodBoardUrls: string[];

  // Format
  format: ProductionFormat;
  aspectRatio: string;

  status: ContentStatus;
}

// Translation request
export interface TranslationRequest {
  sceneId: string;
  projectId: string;
  sceneContent: string;
  semanticData: SemanticSceneData;
  canonContext: CanonContext;

  // Format options
  format: ProductionFormat;
  aspectRatio?: string;

  // Style options
  visualStyle?: VisualStyle;
  shotPreferences?: ShotPreferences;
}

// Translation response
export interface TranslationResponse {
  success: boolean;
  shots: ShotDefinition[];
  error?: string;
  tokensUsed: number;
}

// Visual style configuration
export interface VisualStyle {
  colorPalette?: string;
  lightingStyle?: 'natural' | 'dramatic' | 'noir' | 'high_key' | 'low_key' | 'stylized';
  cinematographyStyle?: 'classical' | 'modern' | 'experimental' | 'documentary';
  eraReference?: string; // e.g., "1940s noir", "90s indie"
  directorReference?: string; // e.g., "Wes Anderson", "Denis Villeneuve"
  moodReference?: string;
}

// Shot preferences
export interface ShotPreferences {
  averageShotDuration?: number;
  preferredShotTypes?: ShotType[];
  avoidShotTypes?: ShotType[];
  maxShotsPerScene?: number;
  includeEstablishingShots?: boolean;
  includeTransitions?: boolean;
}

// Prompt template types
export interface PromptTemplate {
  id: string;
  name: string;
  format: ProductionFormat;
  template: string;
  variables: string[];
  description: string;
}

// Shot prompt generation request
export interface PromptGenerationRequest {
  shot: ShotDefinition;
  template: PromptTemplate;
  visualStyle?: VisualStyle;
  additionalContext?: string;
}

// Mood board types
export interface MoodBoard {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  images: MoodBoardImage[];
  colorPalette: string[];
  keywords: string[];
  createdAt: string;
}

export interface MoodBoardImage {
  url: string;
  caption?: string;
  source?: string;
}

// Pitch deck types
export interface PitchDeck {
  id: string;
  projectId: string;
  title: string;
  logline: string;
  synopsis: string;
  genre: string;
  tone: string;
  targetAudience: string;
  comparables: string[];
  keyScenes: KeyScenePreview[];
  characters: CharacterProfile[];
  visualStyle: VisualStyle;
  createdAt: string;
}

export interface KeyScenePreview {
  sceneTitle: string;
  description: string;
  previewImageUrl?: string;
  emotionalBeat: string;
}

export interface CharacterProfile {
  characterId: string;
  name: string;
  role: string;
  description: string;
  visualDescription?: string;
  referenceImageUrl?: string;
}

// Cinema configuration
export interface CinemaConfig {
  defaultFormat: ProductionFormat;
  defaultAspectRatio: string;
  maxShotsPerScene: number;
  enableAIPromptGeneration: boolean;
  enableMoodBoards: boolean;
  enablePitchDecks: boolean;
}

export const DEFAULT_CINEMA_CONFIG: CinemaConfig = {
  defaultFormat: 'film',
  defaultAspectRatio: '16:9',
  maxShotsPerScene: 20,
  enableAIPromptGeneration: true,
  enableMoodBoards: true,
  enablePitchDecks: true,
};

// Shot type metadata
export const SHOT_TYPE_INFO: Record<ShotType, { name: string; description: string; commonUse: string }> = {
  establishing: {
    name: 'Establishing Shot',
    description: 'Wide shot that establishes location and context',
    commonUse: 'Opening scenes, new locations',
  },
  wide: {
    name: 'Wide Shot',
    description: 'Shows full subject and surroundings',
    commonUse: 'Action sequences, group scenes',
  },
  medium: {
    name: 'Medium Shot',
    description: 'Shows subject from waist up',
    commonUse: 'Dialogue, character interaction',
  },
  close_up: {
    name: 'Close-Up',
    description: 'Tight shot on face or object',
    commonUse: 'Emotional moments, important details',
  },
  extreme_close_up: {
    name: 'Extreme Close-Up',
    description: 'Very tight on specific detail',
    commonUse: 'High tension, critical details',
  },
  over_shoulder: {
    name: 'Over the Shoulder',
    description: 'From behind one subject looking at another',
    commonUse: 'Conversation, confrontation',
  },
  pov: {
    name: 'Point of View',
    description: "Shows what character sees",
    commonUse: 'Subjective experience, discovery',
  },
  aerial: {
    name: 'Aerial Shot',
    description: 'High angle from above',
    commonUse: 'Scale, geography, transitions',
  },
  tracking: {
    name: 'Tracking Shot',
    description: 'Camera follows subject movement',
    commonUse: 'Following action, building tension',
  },
  dolly: {
    name: 'Dolly Shot',
    description: 'Camera moves toward or away from subject',
    commonUse: 'Revealing, dramatic emphasis',
  },
  pan: {
    name: 'Pan',
    description: 'Camera rotates horizontally',
    commonUse: 'Surveying scene, following action',
  },
  tilt: {
    name: 'Tilt',
    description: 'Camera rotates vertically',
    commonUse: 'Revealing height, power dynamics',
  },
  zoom: {
    name: 'Zoom',
    description: 'Lens zoom in or out',
    commonUse: 'Quick focus change, dramatic effect',
  },
  static: {
    name: 'Static Shot',
    description: 'Camera remains stationary',
    commonUse: 'Stability, formal composition',
  },
};
