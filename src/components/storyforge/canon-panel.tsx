'use client';

import * as React from 'react';
import {
  Users,
  MapPin,
  Scroll,
  Calendar,
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
  Search,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { CanonContext } from '@/modules/storyforge';

interface CanonPanelProps {
  canon: CanonContext;
  onEntryClick?: (type: string, id: string) => void;
  onAddEntry?: (type: string) => void;
  className?: string;
}

export function CanonPanel({
  canon,
  onEntryClick,
  onAddEntry,
  className,
}: CanonPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const sections = [
    {
      id: 'characters',
      title: 'Characters',
      icon: Users,
      items: canon.characters,
      color: 'text-blue-600',
    },
    {
      id: 'locations',
      title: 'Locations',
      icon: MapPin,
      items: canon.locations,
      color: 'text-green-600',
    },
    {
      id: 'rules',
      title: 'World Rules',
      icon: Scroll,
      items: canon.rules,
      color: 'text-amber-600',
    },
    {
      id: 'events',
      title: 'Events',
      icon: Calendar,
      items: canon.events,
      color: 'text-purple-600',
    },
    {
      id: 'themes',
      title: 'Themes',
      icon: Sparkles,
      items: canon.themes,
      color: 'text-pink-600',
    },
  ];

  const filterItems = (items: Array<{ name: string; [key: string]: unknown }>) => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className={cn('flex flex-col rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Canon Vault</h3>
      </div>

      {/* Search */}
      <div className="border-b p-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search canon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Canon sections */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" defaultValue={['characters', 'locations']} className="w-full">
          {sections.map((section) => {
            const filteredItems = filterItems(section.items as Array<{ name: string; [key: string]: unknown }>);
            const Icon = section.icon;

            return (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', section.color)} />
                    <span>{section.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({filteredItems.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 px-2 pb-2">
                    {filteredItems.length === 0 ? (
                      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No {section.title.toLowerCase()} yet
                      </p>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={(item as { id: string }).id}
                          onClick={() => onEntryClick?.(section.id, (item as { id: string }).id)}
                          className="canon-entry flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            {(item as { locked?: boolean }).locked ? (
                              <Lock className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Unlock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>{item.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => onAddEntry?.(section.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Add {section.title.slice(0, -1)}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
