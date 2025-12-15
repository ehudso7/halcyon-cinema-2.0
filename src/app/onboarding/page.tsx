'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Film, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Step = 'welcome' | 'mode' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('welcome');
  const [selectedMode, setSelectedMode] = React.useState<'storyforge' | 'cinema' | null>(null);

  const handleComplete = async () => {
    // Update user onboarding status
    // await updateUserOnboarding(selectedMode);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-2xl">
        {step === 'welcome' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Film className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Halcyon Cinema</CardTitle>
              <CardDescription className="text-base">
                Let's get you set up to start writing your story.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">What you'll get:</h3>
                <ul className="space-y-3">
                  {[
                    'AI-powered writing assistance that respects your vision',
                    'Canon Vault to track characters, locations, and world-building',
                    'Publishing-ready exports in multiple formats',
                    'Optional cinematic visualization (Studio plan)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full" onClick={() => setStep('mode')}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'mode' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">How will you use Halcyon Cinema?</CardTitle>
              <CardDescription className="text-base">
                Don't worry, you can always change this later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => setSelectedMode('storyforge')}
                  className={cn(
                    'rounded-lg border-2 p-6 text-left transition-colors',
                    selectedMode === 'storyforge'
                      ? 'border-storyforge-500 bg-storyforge-50'
                      : 'border-border hover:border-storyforge-300'
                  )}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-storyforge-100">
                    <BookOpen className="h-6 w-6 text-storyforge-600" />
                  </div>
                  <h3 className="mb-2 font-semibold">Writer</h3>
                  <p className="text-sm text-muted-foreground">
                    I want to write novels, manuscripts, or series.
                    I'm focused on the craft of storytelling.
                  </p>
                </button>

                <button
                  onClick={() => setSelectedMode('cinema')}
                  className={cn(
                    'rounded-lg border-2 p-6 text-left transition-colors',
                    selectedMode === 'cinema'
                      ? 'border-cinema-500 bg-cinema-50'
                      : 'border-border hover:border-cinema-300'
                  )}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cinema-100">
                    <Film className="h-6 w-6 text-cinema-600" />
                  </div>
                  <h3 className="mb-2 font-semibold">Visual Storyteller</h3>
                  <p className="text-sm text-muted-foreground">
                    I want to write AND visualize. I'm interested in
                    screenwriting, pitching, or production.
                  </p>
                </button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {selectedMode === 'cinema' && (
                  <p>
                    Cinema mode is available on Studio and Enterprise plans.
                    You can start with StoryForge and upgrade anytime.
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('welcome')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedMode}
                  onClick={() => setStep('complete')}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You're All Set!</CardTitle>
              <CardDescription className="text-base">
                Your workspace is ready. Let's create your first project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold">Quick Start Tips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Create a new project from your dashboard</li>
                  <li>2. Set up your Canon Vault with characters and locations</li>
                  <li>3. Start writing - the AI will learn your style</li>
                  <li>4. Export when ready for publishing or sharing</li>
                </ul>
              </div>

              <Button className="w-full" onClick={handleComplete}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
