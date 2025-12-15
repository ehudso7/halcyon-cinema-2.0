'use client';

import * as React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Wand2,
  ChevronDown,
  RefreshCw,
  Expand,
  Shrink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { wordCount } from '@/lib/utils';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onAIAction?: (action: string, selectedText?: string) => void;
  placeholder?: string;
  className?: string;
  wordCountTarget?: number;
  readOnly?: boolean;
}

export function StoryForgeEditor({
  content,
  onChange,
  onAIAction,
  placeholder = 'Start writing your story...',
  className,
  wordCountTarget,
  readOnly = false,
}: EditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = React.useState('');
  const [showAIMenu, setShowAIMenu] = React.useState(false);

  const currentWordCount = wordCount(content);

  const handleSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(content.substring(start, end));
      } else {
        setSelectedText('');
      }
    }
  };

  const handleAIAction = (action: string) => {
    onAIAction?.(action, selectedText || undefined);
    setShowAIMenu(false);
  };

  const aiActions = [
    { id: 'continue', label: 'Continue Writing', icon: Wand2, description: 'Continue from where you left off' },
    { id: 'expand', label: 'Expand Selection', icon: Expand, description: 'Add more detail to selected text', requiresSelection: true },
    { id: 'condense', label: 'Condense Selection', icon: Shrink, description: 'Make selected text more concise', requiresSelection: true },
    { id: 'rewrite', label: 'Rewrite Selection', icon: RefreshCw, description: 'Rewrite selected text', requiresSelection: true },
    { id: 'brainstorm', label: 'Brainstorm Ideas', icon: Sparkles, description: 'Get creative suggestions' },
  ];

  return (
    <div className={cn('flex flex-col rounded-lg border bg-card', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {/* Text formatting */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Actions */}
        {onAIAction && (
          <DropdownMenu open={showAIMenu} onOpenChange={setShowAIMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="storyforge" size="sm" className="gap-2">
                <Wand2 className="h-4 w-4" />
                AI Assist
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {aiActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleAIAction(action.id)}
                  disabled={action.requiresSelection && !selectedText}
                  className="flex flex-col items-start gap-1 py-2"
                >
                  <div className="flex items-center gap-2">
                    <action.icon className="h-4 w-4" />
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Word count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span>{currentWordCount.toLocaleString()} words</span>
          {wordCountTarget && (
            <span className="text-xs">
              / {wordCountTarget.toLocaleString()} target
            </span>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelect}
          placeholder={placeholder}
          className="prose-editor min-h-[500px] resize-none border-0 bg-transparent font-serif text-lg leading-relaxed focus-visible:ring-0"
          readOnly={readOnly}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <div>
          {selectedText && (
            <span>{wordCount(selectedText)} words selected</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>Auto-saved</span>
          {wordCountTarget && (
            <span>
              {Math.round((currentWordCount / wordCountTarget) * 100)}% complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
