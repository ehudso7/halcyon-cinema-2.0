/**
 * Cinema Prompt Templates
 * Templates for generating visual prompts across different production formats
 */

import type { PromptTemplate } from '../types';
import type { ProductionFormat, ShotType } from '@/types/database';

// Base prompt components
const QUALITY_SUFFIX = ', highly detailed, professional cinematography, 8k resolution';
const NEGATIVE_PROMPTS = 'blurry, low quality, amateur, distorted, deformed';

// Format-specific style prefixes
const FORMAT_STYLES: Record<ProductionFormat, string> = {
  film: 'cinematic film still, 35mm film grain, anamorphic lens',
  tv: 'high-end television production, broadcast quality, sharp focus',
  animation: '3D animated, Pixar-style rendering, stylized',
  game: 'video game cinematic, real-time rendering, dramatic lighting',
  web_series: 'digital cinema, modern look, high contrast',
  short: 'artistic short film, auteur style, expressive lighting',
};

// Aspect ratio translations
const ASPECT_RATIO_TERMS: Record<string, string> = {
  '16:9': 'widescreen 16:9 aspect ratio',
  '21:9': 'ultra-wide cinemascope 2.39:1 aspect ratio',
  '4:3': 'classic 4:3 aspect ratio',
  '1:1': 'square 1:1 aspect ratio',
  '9:16': 'vertical 9:16 aspect ratio',
};

// Shot type visual descriptors
const SHOT_TYPE_DESCRIPTORS: Record<ShotType, string> = {
  establishing: 'wide establishing shot showing full environment',
  wide: 'wide shot capturing full scene',
  medium: 'medium shot from waist up',
  close_up: 'close-up shot focused on face',
  extreme_close_up: 'extreme close-up on specific detail',
  over_shoulder: 'over-the-shoulder shot',
  pov: 'first-person point of view shot',
  aerial: 'aerial shot from above',
  tracking: 'tracking shot following movement',
  dolly: 'dolly shot moving through scene',
  pan: 'panning shot across scene',
  tilt: 'tilting shot vertical movement',
  zoom: 'zoom shot',
  static: 'static locked-off shot',
};

// Lighting descriptors
const LIGHTING_STYLES = {
  natural: 'natural ambient lighting, realistic shadows',
  dramatic: 'dramatic chiaroscuro lighting, high contrast',
  noir: 'film noir lighting, deep shadows, single key light',
  high_key: 'high-key lighting, bright and even',
  low_key: 'low-key lighting, moody shadows',
  stylized: 'stylized artistic lighting, expressive colors',
};

// Mood to visual translation
const MOOD_VISUALS: Record<string, string> = {
  tense: 'tight framing, shallow depth of field, cold color grade',
  hopeful: 'warm golden hour lighting, open composition, soft focus',
  melancholic: 'desaturated colors, overcast lighting, isolated framing',
  romantic: 'soft diffused lighting, warm tones, intimate framing',
  action: 'dynamic angles, motion blur, high contrast',
  mysterious: 'deep shadows, fog, silhouettes, cool blue tones',
  joyful: 'bright saturated colors, open wide shots, natural lighting',
  ominous: 'low angles, dark shadows, distorted perspectives',
  peaceful: 'balanced composition, soft natural light, muted tones',
  intense: 'extreme close-ups, stark lighting, shallow DOF',
};

/**
 * Build a visual prompt from shot definition
 */
export function buildVisualPrompt(
  shot: {
    shotType: ShotType;
    description: string;
    composition?: string;
    lighting?: string;
    mood?: string;
    cameraMovement?: string;
  },
  format: ProductionFormat,
  aspectRatio: string = '16:9',
  visualStyle?: {
    colorPalette?: string;
    lightingStyle?: keyof typeof LIGHTING_STYLES;
    eraReference?: string;
    directorReference?: string;
  }
): string {
  const parts: string[] = [];

  // Format style
  parts.push(FORMAT_STYLES[format]);

  // Shot type
  parts.push(SHOT_TYPE_DESCRIPTORS[shot.shotType]);

  // Main description
  parts.push(shot.description);

  // Composition
  if (shot.composition) {
    parts.push(`composition: ${shot.composition}`);
  }

  // Lighting
  if (shot.lighting) {
    parts.push(shot.lighting);
  } else if (visualStyle?.lightingStyle) {
    parts.push(LIGHTING_STYLES[visualStyle.lightingStyle]);
  }

  // Mood visuals
  if (shot.mood && MOOD_VISUALS[shot.mood.toLowerCase()]) {
    parts.push(MOOD_VISUALS[shot.mood.toLowerCase()]);
  }

  // Camera movement (for static image, describe implied motion)
  if (shot.cameraMovement) {
    parts.push(`implied ${shot.cameraMovement}`);
  }

  // Visual style additions
  if (visualStyle?.colorPalette) {
    parts.push(`color palette: ${visualStyle.colorPalette}`);
  }
  if (visualStyle?.eraReference) {
    parts.push(`${visualStyle.eraReference} aesthetic`);
  }
  if (visualStyle?.directorReference) {
    parts.push(`in the style of ${visualStyle.directorReference}`);
  }

  // Aspect ratio
  parts.push(ASPECT_RATIO_TERMS[aspectRatio] || ASPECT_RATIO_TERMS['16:9']);

  // Quality suffix
  parts.push(QUALITY_SUFFIX);

  return parts.join(', ');
}

/**
 * Pre-defined prompt templates for different production formats
 */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Film templates
  {
    id: 'film-dramatic',
    name: 'Dramatic Film',
    format: 'film',
    template: 'cinematic film still, {shot_type}, {description}, dramatic lighting, 35mm film grain, anamorphic lens flare, {mood} atmosphere, {aspect_ratio}, professional color grading, highly detailed',
    variables: ['shot_type', 'description', 'mood', 'aspect_ratio'],
    description: 'Dramatic cinematic look for emotional scenes',
  },
  {
    id: 'film-action',
    name: 'Action Film',
    format: 'film',
    template: 'dynamic action film still, {shot_type}, {description}, high contrast, motion blur, {camera_movement}, intense lighting, IMAX quality, {aspect_ratio}',
    variables: ['shot_type', 'description', 'camera_movement', 'aspect_ratio'],
    description: 'High-energy action sequences',
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    format: 'film',
    template: 'classic film noir, {shot_type}, {description}, high contrast black and white, venetian blind shadows, single key light, {mood}, cigarette smoke, 1940s aesthetic',
    variables: ['shot_type', 'description', 'mood'],
    description: 'Classic noir aesthetic',
  },
  {
    id: 'film-romantic',
    name: 'Romantic Film',
    format: 'film',
    template: 'romantic film still, {shot_type}, {description}, soft diffused lighting, warm color grade, shallow depth of field, golden hour, dreamy atmosphere, {aspect_ratio}',
    variables: ['shot_type', 'description', 'aspect_ratio'],
    description: 'Soft romantic cinematography',
  },

  // TV templates
  {
    id: 'tv-drama',
    name: 'TV Drama',
    format: 'tv',
    template: 'premium television drama, {shot_type}, {description}, {lighting}, broadcast quality, sharp focus, 16:9 HD, {mood} tone',
    variables: ['shot_type', 'description', 'lighting', 'mood'],
    description: 'High-end TV drama look',
  },
  {
    id: 'tv-comedy',
    name: 'TV Comedy',
    format: 'tv',
    template: 'sitcom television style, {shot_type}, {description}, bright even lighting, multi-camera setup feel, clean composition, warm colors',
    variables: ['shot_type', 'description'],
    description: 'Sitcom/comedy lighting',
  },

  // Animation templates
  {
    id: 'animation-3d',
    name: '3D Animation',
    format: 'animation',
    template: 'Pixar-style 3D animation, {shot_type}, {description}, {lighting}, subsurface scattering, ambient occlusion, stylized realism, {mood} mood',
    variables: ['shot_type', 'description', 'lighting', 'mood'],
    description: 'Modern 3D animation style',
  },
  {
    id: 'animation-2d',
    name: '2D Animation',
    format: 'animation',
    template: 'hand-drawn 2D animation frame, {shot_type}, {description}, cel-shaded, expressive line work, {color_palette} colors, Studio Ghibli influence',
    variables: ['shot_type', 'description', 'color_palette'],
    description: 'Traditional 2D animation',
  },
  {
    id: 'animation-anime',
    name: 'Anime Style',
    format: 'animation',
    template: 'anime style, {shot_type}, {description}, dynamic composition, speed lines, dramatic lighting, {mood} atmosphere, Japanese animation aesthetic',
    variables: ['shot_type', 'description', 'mood'],
    description: 'Japanese anime aesthetic',
  },

  // Game templates
  {
    id: 'game-cinematic',
    name: 'Game Cinematic',
    format: 'game',
    template: 'AAA video game cinematic, {shot_type}, {description}, Unreal Engine 5, ray-traced lighting, {mood} atmosphere, photorealistic, {aspect_ratio}',
    variables: ['shot_type', 'description', 'mood', 'aspect_ratio'],
    description: 'Modern game cinematic',
  },
  {
    id: 'game-stylized',
    name: 'Stylized Game',
    format: 'game',
    template: 'stylized video game art, {shot_type}, {description}, hand-painted textures, {color_palette}, cel-shaded, artistic',
    variables: ['shot_type', 'description', 'color_palette'],
    description: 'Stylized game visuals',
  },

  // Short film templates
  {
    id: 'short-arthouse',
    name: 'Art House',
    format: 'short',
    template: 'art house film, {shot_type}, {description}, {lighting}, unconventional composition, {mood}, auteur vision, festival quality',
    variables: ['shot_type', 'description', 'lighting', 'mood'],
    description: 'Artistic short film',
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by format
 */
export function getTemplatesByFormat(format: ProductionFormat): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.format === format);
}

/**
 * Apply variables to template
 */
export function applyTemplate(
  template: PromptTemplate,
  variables: Record<string, string>
): string {
  let result = template.template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  // Remove any unfilled variables
  result = result.replace(/\{[^}]+\}/g, '');
  // Clean up extra commas and spaces
  result = result.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
  return result;
}
