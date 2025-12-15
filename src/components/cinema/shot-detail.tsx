'use client';

import * as React from 'react';
import {
  Camera,
  Copy,
  RefreshCw,
  Wand2,
  ImageIcon,
  Clock,
  Palette,
  Lightbulb,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ShotDefinition } from '@/services/cinema';
import type { ShotType } from '@/types/database';

interface ShotDetailProps {
  shot: ShotDefinition;
  onUpdate?: (updates: Partial<ShotDefinition>) => void;
  onRegenerate?: (instructions?: string) => void;
  onGeneratePreview?: () => void;
  className?: string;
}

const shotTypes: { value: ShotType; label: string }[] = [
  { value: 'establishing', label: 'Establishing' },
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'close_up', label: 'Close-Up' },
  { value: 'extreme_close_up', label: 'Extreme Close-Up' },
  { value: 'over_shoulder', label: 'Over the Shoulder' },
  { value: 'pov', label: 'Point of View' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'static', label: 'Static' },
];

export function ShotDetail({
  shot,
  onUpdate,
  onRegenerate,
  onGeneratePreview,
  className,
}: ShotDetailProps) {
  const [regenerateInstructions, setRegenerateInstructions] = React.useState('');

  const copyPrompt = () => {
    if (shot.visualPrompt) {
      navigator.clipboard.writeText(shot.visualPrompt);
    }
  };

  return (
    <div className={cn('flex flex-col rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-cinema-500" />
          <h3 className="font-semibold">Shot #{shot.orderIndex + 1}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyPrompt}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Prompt
          </Button>
          <Button variant="cinema" size="sm" onClick={onGeneratePreview}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Generate Preview
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="details" className="flex-1">
        <TabsList className="w-full justify-start border-b bg-transparent p-0">
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-cinema-500"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="prompt"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-cinema-500"
          >
            Visual Prompt
          </TabsTrigger>
          <TabsTrigger
            value="regenerate"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 data-[state=active]:border-cinema-500"
          >
            Regenerate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="p-4">
          <div className="grid gap-4">
            {/* Shot Type */}
            <div>
              <label className="mb-2 block text-sm font-medium">Shot Type</label>
              <Select
                value={shot.shotType}
                onValueChange={(value: ShotType) => onUpdate?.({ shotType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shotTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <Textarea
                value={shot.description}
                onChange={(e) => onUpdate?.({ description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={shot.durationSeconds || ''}
                  onChange={(e) =>
                    onUpdate?.({ durationSeconds: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4" />
                  Mood
                </label>
                <Input
                  value={shot.mood || ''}
                  onChange={(e) => onUpdate?.({ mood: e.target.value })}
                  placeholder="e.g., tense, hopeful"
                />
              </div>
            </div>

            {/* Camera Movement */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Video className="h-4 w-4" />
                Camera Movement
              </label>
              <Input
                value={shot.cameraMovement || ''}
                onChange={(e) => onUpdate?.({ cameraMovement: e.target.value })}
                placeholder="e.g., slow push in, pan left"
              />
            </div>

            {/* Lighting */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4" />
                Lighting
              </label>
              <Input
                value={shot.lighting || ''}
                onChange={(e) => onUpdate?.({ lighting: e.target.value })}
                placeholder="e.g., dramatic side lighting, golden hour"
              />
            </div>

            {/* Composition */}
            <div>
              <label className="mb-2 block text-sm font-medium">Composition Notes</label>
              <Textarea
                value={shot.composition || ''}
                onChange={(e) => onUpdate?.({ composition: e.target.value })}
                rows={2}
                placeholder="Framing and composition details..."
              />
            </div>

            {/* Technical Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">Technical Notes</label>
              <Textarea
                value={shot.technicalNotes || ''}
                onChange={(e) => onUpdate?.({ technicalNotes: e.target.value })}
                rows={2}
                placeholder="VFX requirements, special equipment..."
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Generated Visual Prompt</label>
              <Textarea
                value={shot.visualPrompt || ''}
                onChange={(e) => onUpdate?.({ visualPrompt: e.target.value })}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Template: {shot.promptTemplate || 'Default'}</span>
              <span>|</span>
              <span>Format: {shot.format}</span>
              <span>|</span>
              <span>Aspect: {shot.aspectRatio}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regenerate" className="p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Regeneration Instructions
              </label>
              <Textarea
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                rows={4}
                placeholder="Describe how you want the shot to be different..."
              />
            </div>
            <Button
              variant="cinema"
              onClick={() => onRegenerate?.(regenerateInstructions)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Shot
            </Button>
            <p className="text-sm text-muted-foreground">
              The AI will generate a new shot based on the scene content and your
              instructions while respecting the established canon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
