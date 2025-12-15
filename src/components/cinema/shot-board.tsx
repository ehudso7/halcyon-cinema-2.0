'use client';

import * as React from 'react';
import {
  Camera,
  Film,
  RefreshCw,
  Copy,
  Trash2,
  GripVertical,
  ChevronDown,
  Image,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ShotDefinition, SHOT_TYPE_INFO } from '@/services/cinema';
import type { ShotType } from '@/types/database';

interface ShotBoardProps {
  shots: ShotDefinition[];
  onShotSelect?: (shot: ShotDefinition) => void;
  onShotRegenerate?: (shot: ShotDefinition) => void;
  onShotDelete?: (shotId: string) => void;
  onReorder?: (shots: ShotDefinition[]) => void;
  selectedShotId?: string;
  className?: string;
}

const shotTypeInfo: Record<ShotType, { name: string; color: string }> = {
  establishing: { name: 'Establishing', color: 'bg-blue-100 text-blue-700' },
  wide: { name: 'Wide', color: 'bg-green-100 text-green-700' },
  medium: { name: 'Medium', color: 'bg-amber-100 text-amber-700' },
  close_up: { name: 'Close-Up', color: 'bg-red-100 text-red-700' },
  extreme_close_up: { name: 'ECU', color: 'bg-red-200 text-red-800' },
  over_shoulder: { name: 'OTS', color: 'bg-purple-100 text-purple-700' },
  pov: { name: 'POV', color: 'bg-pink-100 text-pink-700' },
  aerial: { name: 'Aerial', color: 'bg-sky-100 text-sky-700' },
  tracking: { name: 'Tracking', color: 'bg-indigo-100 text-indigo-700' },
  dolly: { name: 'Dolly', color: 'bg-violet-100 text-violet-700' },
  pan: { name: 'Pan', color: 'bg-teal-100 text-teal-700' },
  tilt: { name: 'Tilt', color: 'bg-cyan-100 text-cyan-700' },
  zoom: { name: 'Zoom', color: 'bg-orange-100 text-orange-700' },
  static: { name: 'Static', color: 'bg-gray-100 text-gray-700' },
};

export function ShotBoard({
  shots,
  onShotSelect,
  onShotRegenerate,
  onShotDelete,
  onReorder,
  selectedShotId,
  className,
}: ShotBoardProps) {
  const [draggedShot, setDraggedShot] = React.useState<string | null>(null);

  const handleDragStart = (shotId: string) => {
    setDraggedShot(shotId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (!draggedShot || !onReorder) return;

    const sourceIndex = shots.findIndex((s) => s.id === draggedShot);
    if (sourceIndex === -1) return;

    const newShots = [...shots];
    const [removed] = newShots.splice(sourceIndex, 1);
    newShots.splice(targetIndex, 0, removed);

    // Update order indices
    const reorderedShots = newShots.map((shot, index) => ({
      ...shot,
      orderIndex: index,
    }));

    onReorder(reorderedShots);
    setDraggedShot(null);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Shot Board</h3>
        <span className="text-sm text-muted-foreground">
          {shots.length} shots
        </span>
      </div>

      {/* Shot grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shots.map((shot, index) => {
          const typeInfo = shotTypeInfo[shot.shotType];
          const isSelected = shot.id === selectedShotId;

          return (
            <Card
              key={shot.id}
              draggable
              onDragStart={() => handleDragStart(shot.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onClick={() => onShotSelect?.(shot)}
              className={cn(
                'shot-card cursor-pointer',
                isSelected && 'ring-2 ring-cinema-500',
                draggedShot === shot.id && 'opacity-50'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      #{shot.orderIndex + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        typeInfo.color
                      )}
                    >
                      {typeInfo.name}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onShotRegenerate?.(shot)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(shot.visualPrompt || '')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Prompt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onShotDelete?.(shot.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Preview placeholder */}
                <div className="mb-3 flex aspect-video items-center justify-center rounded-md bg-muted">
                  {shot.previewImageUrl ? (
                    <img
                      src={shot.previewImageUrl}
                      alt={shot.description}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Film className="h-8 w-8" />
                      <span className="text-xs">No preview</span>
                    </div>
                  )}
                </div>

                {/* Shot description */}
                <p className="mb-2 line-clamp-2 text-sm">{shot.description}</p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {shot.durationSeconds && (
                    <span>{shot.durationSeconds}s</span>
                  )}
                  {shot.mood && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {shot.mood}
                    </span>
                  )}
                  {shot.cameraMovement && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {shot.cameraMovement}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {shots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
          <h4 className="mb-2 font-medium">No shots yet</h4>
          <p className="mb-4 text-sm text-muted-foreground">
            Generate shots from your scene to get started
          </p>
          <Button variant="cinema" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Generate Shots
          </Button>
        </div>
      )}
    </div>
  );
}
