/**
 * StoryForge Public Adapter
 * The ONLY public interface for external systems (including Cinema) to interact with StoryForge
 *
 * This adapter ensures:
 * 1. Cinema never imports StoryForge internals
 * 2. All canon operations go through proper channels
 * 3. Semantic data extraction is cleanly abstracted
 */

import { getStoryForgeGenerator, StoryForgeGenerator } from '../engine/generator';
import { getCanonManager, CanonManager } from '../canon/manager';
import type {
  StoryForgeAdapter,
  CanonContext,
  CanonConflict,
  SemanticSceneData,
  GenerationRequest,
  GenerationResponse,
  StoryForgeConfig,
} from '../types';

class StoryForgePublicAdapter implements StoryForgeAdapter {
  private generator: StoryForgeGenerator;
  private canonManager: CanonManager;

  constructor(config?: Partial<StoryForgeConfig>) {
    this.generator = getStoryForgeGenerator(config);
    this.canonManager = getCanonManager();
  }

  /**
   * Extract semantic data from scene content for cinema translation
   * This is the primary interface for Cinema mode to understand narrative content
   */
  async extractSemanticData(
    sceneContent: string,
    canonContext: CanonContext
  ): Promise<SemanticSceneData> {
    return this.generator.extractSemanticData(sceneContent, canonContext);
  }

  /**
   * Load complete canon context for a project
   */
  async loadCanonContext(projectId: string): Promise<CanonContext> {
    return this.canonManager.loadCanonContext(projectId);
  }

  /**
   * Validate content against established canon
   */
  async validateAgainstCanon(
    content: string,
    canonContext: CanonContext
  ): Promise<CanonConflict[]> {
    return this.generator.validateAgainstCanon(content, canonContext);
  }

  /**
   * Generate content (protected - requires proper authorization context)
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Load canon context
    const canonContext = await this.loadCanonContext(request.projectId);

    // Load previous content if requested
    let previousContent: string | undefined;
    if (request.loadPreviousChapters || request.loadPreviousScenes) {
      previousContent = await this.loadPreviousContent(
        request.projectId,
        request.loadPreviousChapters,
        request.loadPreviousScenes
      );
    }

    return this.generator.generate(request, canonContext, previousContent);
  }

  /**
   * Load previous content for context
   */
  private async loadPreviousContent(
    projectId: string,
    chapterCount?: number,
    sceneCount?: number
  ): Promise<string> {
    // This would load recent chapters/scenes for context
    // Implementation depends on database structure
    // For now, return empty string - will be implemented with full data layer
    return '';
  }
}

// Factory function to create adapter instance
export function createStoryForgeAdapter(
  config?: Partial<StoryForgeConfig>
): StoryForgeAdapter {
  return new StoryForgePublicAdapter(config);
}

// Singleton for common use cases
let adapterInstance: StoryForgeAdapter | null = null;

export function getStoryForgeAdapter(): StoryForgeAdapter {
  if (!adapterInstance) {
    adapterInstance = createStoryForgeAdapter();
  }
  return adapterInstance;
}
