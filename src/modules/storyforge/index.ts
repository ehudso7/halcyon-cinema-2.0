/**
 * StoryForge Module Public Exports
 *
 * IMPORTANT: This is the ONLY file that should be imported from outside the storyforge module.
 * All other imports should go through this barrel file.
 *
 * The public API is intentionally limited to:
 * 1. The StoryForge adapter (for Cinema integration)
 * 2. Type definitions
 * 3. The Canon Manager (for UI operations)
 */

// Public Adapter - THE primary interface for Cinema and other consumers
export {
  createStoryForgeAdapter,
  getStoryForgeAdapter,
} from './adapters/public-adapter';

// Types - All type definitions needed by consumers
export type {
  // Core types
  StoryForgeAdapter,
  StoryForgeConfig,
  GenerationAction,
  GenerationTarget,
  GenerationRequest,
  GenerationResponse,

  // Canon types
  CanonContext,
  CanonCharacterContext,
  CanonLocationContext,
  CanonRuleContext,
  CanonEventContext,
  CanonThemeContext,
  CanonConflict,
  ConflictResolutionRequest,

  // Semantic types (for Cinema)
  SemanticSceneData,
  CharacterState,

  // Writing types
  WritingSession,
  WritingStyle,
  ChapterOutline,
  SeriesOutline,
} from './types';

// Default config
export { DEFAULT_STORYFORGE_CONFIG } from './types';

// Canon Manager - For direct canon operations in UI
export { getCanonManager, CanonManager } from './canon/manager';

// Generator - For direct generation in API routes (NOT for Cinema)
export { getStoryForgeGenerator, StoryForgeGenerator } from './engine/generator';
