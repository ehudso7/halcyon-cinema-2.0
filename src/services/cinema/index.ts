/**
 * Cinema Service Public Exports
 *
 * This service handles all cinematic visualization:
 * - Scene to shot translation
 * - Visual prompt generation
 * - Mood board management
 * - Pitch deck generation
 */

// Types
export type {
  ShotDefinition,
  TranslationRequest,
  TranslationResponse,
  VisualStyle,
  ShotPreferences,
  PromptTemplate,
  PromptGenerationRequest,
  MoodBoard,
  MoodBoardImage,
  PitchDeck,
  KeyScenePreview,
  CharacterProfile,
  CinemaConfig,
} from './types';

export { DEFAULT_CINEMA_CONFIG, SHOT_TYPE_INFO } from './types';

// Scene Translator
export { getSceneTranslator, SceneTranslator } from './translator/scene-translator';

// Prompt Templates
export {
  buildVisualPrompt,
  getTemplateById,
  getTemplatesByFormat,
  applyTemplate,
  PROMPT_TEMPLATES,
} from './prompts/templates';
