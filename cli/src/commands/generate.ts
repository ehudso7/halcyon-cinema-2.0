/**
 * Generate Commands
 * AI content generation
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../utils/config.js';

interface GenerateOptions {
  chapter?: string;
  words?: string;
}

async function getAnthropicClient(): Promise<Anthropic | null> {
  const config = getConfig();
  const apiKey = config.get('anthropicApiKey') || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log(chalk.yellow('Anthropic API key not set.'));
    console.log(chalk.gray('Run: storyforge config set anthropicApiKey YOUR_KEY'));
    return null;
  }

  return new Anthropic({ apiKey });
}

async function loadCanonContext(): Promise<string> {
  const types = ['characters', 'locations', 'rules'];
  const parts: string[] = [];

  for (const type of types) {
    try {
      const filePath = path.join(process.cwd(), 'canon', `${type}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const entries = data[type] || [];

      if (entries.length > 0) {
        parts.push(`## ${type.toUpperCase()}`);
        for (const entry of entries) {
          parts.push(`- ${entry.name}: ${entry.description || 'No description'}`);
        }
        parts.push('');
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  return parts.join('\n');
}

async function loadChapterContent(chapterPath?: string): Promise<string> {
  if (chapterPath) {
    return fs.readFile(chapterPath, 'utf-8');
  }

  // Find the latest chapter
  const chaptersDir = path.join(process.cwd(), 'chapters');
  const files = await fs.readdir(chaptersDir);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort();

  if (mdFiles.length === 0) {
    return '';
  }

  const latestChapter = mdFiles[mdFiles.length - 1];
  return fs.readFile(path.join(chaptersDir, latestChapter), 'utf-8');
}

export const generateCommand = {
  async continue(options: GenerateOptions): Promise<void> {
    const client = await getAnthropicClient();
    if (!client) return;

    const spinner = ora('Loading context...').start();

    try {
      const canonContext = await loadCanonContext();
      const currentContent = await loadChapterContent(options.chapter);
      const targetWords = parseInt(options.words || '500');

      spinner.text = 'Generating content...';

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: Math.ceil(targetWords * 1.5),
        system: `You are StoryForge, an expert creative writing assistant. Continue the story naturally while respecting the established canon.

CANON CONTEXT:
${canonContext || 'No canon established yet.'}

GUIDELINES:
- Continue from exactly where the text ends
- Maintain consistent voice and style
- Respect all canon elements
- Write approximately ${targetWords} words
- Do not include any meta-commentary, just write the story`,
        messages: [
          {
            role: 'user',
            content: `Continue this story:\n\n${currentContent || 'Begin the story...'}`,
          },
        ],
      });

      spinner.stop();

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      console.log(chalk.bold.cyan('\n  Generated Content:\n'));
      console.log(chalk.white(content.text));
      console.log('');

      // Offer to append
      console.log(chalk.gray('  To append to your chapter, copy the text above.'));
      console.log(chalk.gray(`  Tokens used: ${response.usage.input_tokens + response.usage.output_tokens}`));
    } catch (error) {
      spinner.fail(chalk.red('Generation failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async expand(text: string): Promise<void> {
    const client = await getAnthropicClient();
    if (!client) return;

    const spinner = ora('Expanding text...').start();

    try {
      const canonContext = await loadCanonContext();

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are StoryForge. Expand the given text with more detail, sensory description, and depth while preserving the original meaning.

CANON CONTEXT:
${canonContext || 'No canon established yet.'}`,
        messages: [
          {
            role: 'user',
            content: `Expand this text:\n\n${text}`,
          },
        ],
      });

      spinner.stop();

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      console.log(chalk.bold.cyan('\n  Expanded Text:\n'));
      console.log(chalk.white(content.text));
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Expansion failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async brainstorm(topic: string): Promise<void> {
    const client = await getAnthropicClient();
    if (!client) return;

    const spinner = ora('Brainstorming ideas...').start();

    try {
      const canonContext = await loadCanonContext();

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are StoryForge. Generate creative ideas that respect the established canon.

CANON CONTEXT:
${canonContext || 'No canon established yet.'}`,
        messages: [
          {
            role: 'user',
            content: `Brainstorm 5-7 creative ideas for: ${topic}

Format as a numbered list with brief explanations.`,
          },
        ],
      });

      spinner.stop();

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      console.log(chalk.bold.cyan('\n  Ideas:\n'));
      console.log(chalk.white(content.text));
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Brainstorming failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async outline(options: { chapter?: string }): Promise<void> {
    const client = await getAnthropicClient();
    if (!client) return;

    const spinner = ora('Generating outline...').start();

    try {
      const canonContext = await loadCanonContext();
      const chapterNumber = options.chapter || 'next';

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are StoryForge. Create a detailed chapter outline respecting the established canon.

CANON CONTEXT:
${canonContext || 'No canon established yet.'}`,
        messages: [
          {
            role: 'user',
            content: `Create a detailed outline for chapter ${chapterNumber}.

Include:
- Chapter title
- Key scenes (3-5)
- Character involvement
- Emotional beats
- Plot points
- Pacing notes`,
          },
        ],
      });

      spinner.stop();

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      console.log(chalk.bold.cyan('\n  Chapter Outline:\n'));
      console.log(chalk.white(content.text));
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Outline generation failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },
};
