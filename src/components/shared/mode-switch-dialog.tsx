'use client';

import * as React from 'react';
import { BookOpen, Film, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectMode, SubscriptionTier } from '@/types/database';

interface ModeSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: ProjectMode;
  targetMode: ProjectMode;
  userTier: SubscriptionTier;
  projectTitle: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ModeSwitchDialog({
  open,
  onOpenChange,
  currentMode,
  targetMode,
  userTier,
  projectTitle,
  onConfirm,
  isLoading = false,
}: ModeSwitchDialogProps) {
  const canAccessCinema = ['studio', 'enterprise'].includes(userTier);
  const needsUpgrade = targetMode === 'cinema' && !canAccessCinema;

  const modeInfo = {
    storyforge: {
      name: 'StoryForge',
      icon: BookOpen,
      color: 'text-storyforge-600',
      bgColor: 'bg-storyforge-50',
      description: 'Full writing environment with AI assistance, canon management, and publishing-ready exports.',
    },
    cinema: {
      name: 'Cinema',
      icon: Film,
      color: 'text-cinema-600',
      bgColor: 'bg-cinema-50',
      description: 'Visual storytelling tools including shot generation, mood boards, and pitch deck creation.',
    },
  };

  const from = modeInfo[currentMode];
  const to = modeInfo[targetMode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Switch Project Mode</DialogTitle>
          <DialogDescription>
            Change "{projectTitle}" from {from.name} to {to.name} mode
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Mode transition visual */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className={cn('rounded-lg p-4', from.bgColor)}>
              <from.icon className={cn('h-8 w-8', from.color)} />
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className={cn('rounded-lg p-4', to.bgColor)}>
              <to.icon className={cn('h-8 w-8', to.color)} />
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-2 font-medium">{to.name} Mode</h4>
            <p className="text-sm text-muted-foreground">{to.description}</p>
          </div>

          {/* Warning or upgrade notice */}
          {needsUpgrade ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h4 className="font-medium text-amber-900">Upgrade Required</h4>
                <p className="mt-1 text-sm text-amber-700">
                  Cinema mode requires a Studio or Enterprise subscription. Upgrade
                  your plan to access cinematic visualization features.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                You can switch between modes at any time. All your content and canon
                will be preserved. No content will be lost.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {needsUpgrade ? (
            <Button variant="cinema" asChild>
              <a href="/pricing">View Plans</a>
            </Button>
          ) : (
            <Button
              variant={targetMode === 'cinema' ? 'cinema' : 'storyforge'}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Switching...' : `Switch to ${to.name}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
