/**
 * Canon Commands
 * Manage canon vault entries
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

interface CanonEntry {
  id: string;
  name: string;
  description?: string;
  locked?: boolean;
  data?: Record<string, unknown>;
}

interface CanonFile {
  characters?: CanonEntry[];
  locations?: CanonEntry[];
  rules?: CanonEntry[];
  events?: CanonEntry[];
  themes?: CanonEntry[];
}

async function loadCanonFile(type: string): Promise<CanonEntry[]> {
  try {
    const filePath = path.join(process.cwd(), 'canon', `${type}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data[type] || [];
  } catch {
    return [];
  }
}

async function saveCanonFile(type: string, entries: CanonEntry[]): Promise<void> {
  const filePath = path.join(process.cwd(), 'canon', `${type}.json`);
  await fs.writeFile(filePath, JSON.stringify({ [type]: entries }, null, 2));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const canonCommand = {
  async list(options: { type?: string }): Promise<void> {
    console.log(chalk.bold.cyan('\n  Canon Vault\n'));

    const types = options.type ? [options.type] : ['characters', 'locations', 'rules', 'events', 'themes'];
    const typeIcons: Record<string, string> = {
      characters: '👤',
      locations: '📍',
      rules: '📜',
      events: '📅',
      themes: '✨',
    };

    for (const type of types) {
      const entries = await loadCanonFile(type);

      console.log(`  ${typeIcons[type] || '•'} ${chalk.bold(type.charAt(0).toUpperCase() + type.slice(1))} (${entries.length})`);

      if (entries.length === 0) {
        console.log(chalk.gray('    No entries'));
      } else {
        for (const entry of entries) {
          const lockIcon = entry.locked ? '🔒' : '';
          console.log(`    ${lockIcon} ${entry.name}`);
          if (entry.description) {
            console.log(chalk.gray(`      ${entry.description.substring(0, 60)}${entry.description.length > 60 ? '...' : ''}`));
          }
        }
      }
      console.log('');
    }
  },

  async add(type: string, name: string, options: { description?: string }): Promise<void> {
    const validTypes = ['character', 'location', 'rule', 'event', 'theme'];
    const pluralType = type.endsWith('s') ? type : type + 's';

    if (!validTypes.includes(type) && !validTypes.map(t => t + 's').includes(type)) {
      console.log(chalk.red(`Invalid type. Must be one of: ${validTypes.join(', ')}`));
      return;
    }

    const spinner = ora(`Adding ${type}...`).start();

    try {
      const entries = await loadCanonFile(pluralType);

      // Check for duplicate
      if (entries.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        spinner.fail(chalk.red(`${type} "${name}" already exists`));
        return;
      }

      const newEntry: CanonEntry = {
        id: generateId(),
        name,
        description: options.description,
        locked: false,
      };

      entries.push(newEntry);
      await saveCanonFile(pluralType, entries);

      spinner.succeed(chalk.green(`Added ${type}: ${name}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to add entry'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async show(nameOrId: string): Promise<void> {
    const types = ['characters', 'locations', 'rules', 'events', 'themes'];

    for (const type of types) {
      const entries = await loadCanonFile(type);
      const entry = entries.find(
        e => e.id === nameOrId || e.name.toLowerCase() === nameOrId.toLowerCase()
      );

      if (entry) {
        console.log(chalk.bold.cyan(`\n  ${entry.name}\n`));
        console.log(`  Type:        ${type.slice(0, -1)}`);
        console.log(`  ID:          ${entry.id}`);
        console.log(`  Locked:      ${entry.locked ? 'Yes' : 'No'}`);
        if (entry.description) {
          console.log(`  Description: ${entry.description}`);
        }
        if (entry.data) {
          console.log(`\n  Additional Data:`);
          console.log(chalk.gray(JSON.stringify(entry.data, null, 2)));
        }
        console.log('');
        return;
      }
    }

    console.log(chalk.yellow(`Entry "${nameOrId}" not found`));
  },

  async lock(nameOrId: string, options: { hard?: boolean }): Promise<void> {
    const types = ['characters', 'locations', 'rules', 'events', 'themes'];

    for (const type of types) {
      const entries = await loadCanonFile(type);
      const index = entries.findIndex(
        e => e.id === nameOrId || e.name.toLowerCase() === nameOrId.toLowerCase()
      );

      if (index !== -1) {
        const entry = entries[index];

        if (entry.locked) {
          console.log(chalk.yellow(`"${entry.name}" is already locked`));
          return;
        }

        entries[index] = {
          ...entry,
          locked: true,
          data: {
            ...entry.data,
            lockType: options.hard ? 'hard' : 'soft',
            lockedAt: new Date().toISOString(),
          },
        };

        await saveCanonFile(type, entries);

        const lockType = options.hard ? 'Hard locked' : 'Locked';
        console.log(chalk.green(`${lockType}: ${entry.name}`));
        return;
      }
    }

    console.log(chalk.yellow(`Entry "${nameOrId}" not found`));
  },
};
