'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Film,
  Home,
  Settings,
  Library,
  Users,
  MapPin,
  Scroll,
  Calendar,
  Sparkles,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Palette,
  PresentationIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ProjectMode, SubscriptionTier } from '@/types/database';

interface SidebarProps {
  projectId?: string;
  projectMode?: ProjectMode;
  userTier: SubscriptionTier;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  mode?: ProjectMode | 'both';
  requiredTier?: SubscriptionTier[];
}

const mainNav: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home, mode: 'both' },
  { title: 'Projects', href: '/dashboard/projects', icon: Library, mode: 'both' },
];

const projectNav = (projectId: string): NavItem[] => [
  { title: 'Overview', href: `/project/${projectId}`, icon: BookOpen, mode: 'both' },
  { title: 'Chapters', href: `/project/${projectId}/chapters`, icon: FileText, mode: 'storyforge' },
  { title: 'Canon Vault', href: `/project/${projectId}/canon`, icon: Library, mode: 'both' },
];

const canonNav = (projectId: string): NavItem[] => [
  { title: 'Characters', href: `/project/${projectId}/canon/characters`, icon: Users, mode: 'both' },
  { title: 'Locations', href: `/project/${projectId}/canon/locations`, icon: MapPin, mode: 'both' },
  { title: 'Rules', href: `/project/${projectId}/canon/rules`, icon: Scroll, mode: 'both' },
  { title: 'Events', href: `/project/${projectId}/canon/events`, icon: Calendar, mode: 'both' },
  { title: 'Themes', href: `/project/${projectId}/canon/themes`, icon: Sparkles, mode: 'both' },
];

const cinemaNav = (projectId: string): NavItem[] => [
  { title: 'Shot Board', href: `/project/${projectId}/cinema/shots`, icon: Clapperboard, mode: 'cinema', requiredTier: ['studio', 'enterprise'] },
  { title: 'Mood Boards', href: `/project/${projectId}/cinema/moodboards`, icon: Palette, mode: 'cinema', requiredTier: ['studio', 'enterprise'] },
  { title: 'Pitch Deck', href: `/project/${projectId}/cinema/pitch`, icon: PresentationIcon, mode: 'cinema', requiredTier: ['studio', 'enterprise'] },
];

const bottomNav: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings, mode: 'both' },
  { title: 'Help', href: '/help', icon: HelpCircle, mode: 'both' },
];

export function Sidebar({
  projectId,
  projectMode,
  userTier,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();

  const canAccessCinema = ['studio', 'enterprise'].includes(userTier);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const canShowItem = (item: NavItem) => {
    // Check mode
    if (item.mode !== 'both' && item.mode !== projectMode) {
      return false;
    }
    // Check tier
    if (item.requiredTier && !item.requiredTier.includes(userTier)) {
      return false;
    }
    return true;
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    if (!canShowItem(item)) return null;

    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b px-4', collapsed && 'justify-center px-2')}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="font-semibold">Halcyon Cinema</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Project Navigation */}
        {projectId && (
          <>
            <div className="my-4 border-t" />
            <div className="space-y-1">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Project
                </p>
              )}
              {projectNav(projectId).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>

            {/* Canon Navigation */}
            <div className="my-4 border-t" />
            <div className="space-y-1">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Canon Vault
                </p>
              )}
              {canonNav(projectId).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>

            {/* Cinema Navigation (only in cinema mode) */}
            {projectMode === 'cinema' && canAccessCinema && (
              <>
                <div className="my-4 border-t" />
                <div className="space-y-1">
                  {!collapsed && (
                    <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                      Cinema
                    </p>
                  )}
                  {cinemaNav(projectId).map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t p-4">
        <div className="space-y-1">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  );
}
