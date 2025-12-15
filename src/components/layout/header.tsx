'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  CreditCard,
  BookOpen,
  Film,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ProjectMode, SubscriptionTier, User as UserType } from '@/types/database';

interface HeaderProps {
  user?: UserType | null;
  projectMode?: ProjectMode;
  projectTitle?: string;
  canSwitchMode?: boolean;
  onModeSwitch?: () => void;
}

export function Header({
  user,
  projectMode,
  projectTitle,
  canSwitchMode,
  onModeSwitch,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const tierBadge = (tier: SubscriptionTier) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700',
      pro: 'bg-storyforge-100 text-storyforge-700',
      studio: 'bg-cinema-100 text-cinema-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colors[tier])}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Left side - Project info */}
      <div className="flex items-center gap-4">
        {projectTitle && (
          <>
            <h1 className="font-semibold">{projectTitle}</h1>
            {projectMode && (
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  projectMode === 'storyforge'
                    ? 'bg-storyforge-100 text-storyforge-700'
                    : 'bg-cinema-100 text-cinema-700'
                )}
              >
                {projectMode === 'storyforge' ? (
                  <>
                    <BookOpen className="h-3 w-3" />
                    StoryForge
                  </>
                ) : (
                  <>
                    <Film className="h-3 w-3" />
                    Cinema
                  </>
                )}
              </div>
            )}
            {canSwitchMode && onModeSwitch && (
              <Button
                variant="outline"
                size="sm"
                onClick={onModeSwitch}
                className="gap-2"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Switch to {projectMode === 'storyforge' ? 'Cinema' : 'StoryForge'}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden md:block">
                  {user.display_name || user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>My Account</span>
                {tierBadge(user.subscription_tier)}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/auth/logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
