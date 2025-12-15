#!/usr/bin/env node
/**
 * StoryForge CLI
 * Command-line tool for managing writing projects
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { projectCommand } from './commands/project.js';
import { canonCommand } from './commands/canon.js';
import { generateCommand } from './commands/generate.js';
import { exportCommand } from './commands/export.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('storyforge')
  .description('CLI tool for StoryForge writing projects')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize a new StoryForge project')
  .option('-n, --name <name>', 'Project name')
  .option('-g, --genre <genre>', 'Project genre')
  .option('-d, --directory <dir>', 'Project directory', '.')
  .action(initCommand);

// Project commands
program
  .command('project')
  .description('Manage projects')
  .addCommand(
    new Command('list')
      .description('List all projects')
      .action(() => projectCommand.list())
  )
  .addCommand(
    new Command('info')
      .description('Show project info')
      .argument('[project-id]', 'Project ID (uses current if not specified)')
      .action((projectId) => projectCommand.info(projectId))
  )
  .addCommand(
    new Command('sync')
      .description('Sync project with cloud')
      .argument('[project-id]', 'Project ID')
      .action((projectId) => projectCommand.sync(projectId))
  );

// Canon commands
program
  .command('canon')
  .description('Manage canon entries')
  .addCommand(
    new Command('list')
      .description('List canon entries')
      .option('-t, --type <type>', 'Filter by type (character, location, rule, event, theme)')
      .action((options) => canonCommand.list(options))
  )
  .addCommand(
    new Command('add')
      .description('Add a canon entry')
      .argument('<type>', 'Entry type')
      .argument('<name>', 'Entry name')
      .option('-d, --description <desc>', 'Entry description')
      .action((type, name, options) => canonCommand.add(type, name, options))
  )
  .addCommand(
    new Command('show')
      .description('Show canon entry details')
      .argument('<name-or-id>', 'Entry name or ID')
      .action((nameOrId) => canonCommand.show(nameOrId))
  )
  .addCommand(
    new Command('lock')
      .description('Lock a canon entry')
      .argument('<name-or-id>', 'Entry name or ID')
      .option('--hard', 'Apply hard lock (cannot be unlocked without admin)')
      .action((nameOrId, options) => canonCommand.lock(nameOrId, options))
  );

// Generate commands
program
  .command('generate')
  .alias('gen')
  .description('Generate content with AI')
  .addCommand(
    new Command('continue')
      .description('Continue writing from current position')
      .option('-c, --chapter <id>', 'Chapter ID')
      .option('-w, --words <count>', 'Target word count', '500')
      .action((options) => generateCommand.continue(options))
  )
  .addCommand(
    new Command('expand')
      .description('Expand selected text')
      .argument('<text>', 'Text to expand')
      .action((text) => generateCommand.expand(text))
  )
  .addCommand(
    new Command('brainstorm')
      .description('Brainstorm ideas')
      .argument('<topic>', 'Topic to brainstorm')
      .action((topic) => generateCommand.brainstorm(topic))
  )
  .addCommand(
    new Command('outline')
      .description('Generate a chapter outline')
      .option('-c, --chapter <number>', 'Chapter number')
      .action((options) => generateCommand.outline(options))
  );

// Export commands
program
  .command('export')
  .description('Export project')
  .argument('<format>', 'Export format (docx, pdf, epub, fountain, markdown)')
  .option('-o, --output <file>', 'Output file path')
  .option('-c, --chapters <ids>', 'Specific chapter IDs (comma-separated)')
  .action(exportCommand);

// Config commands
program
  .command('config')
  .description('Manage CLI configuration')
  .addCommand(
    new Command('set')
      .description('Set a config value')
      .argument('<key>', 'Config key')
      .argument('<value>', 'Config value')
      .action((key, value) => configCommand.set(key, value))
  )
  .addCommand(
    new Command('get')
      .description('Get a config value')
      .argument('<key>', 'Config key')
      .action((key) => configCommand.get(key))
  )
  .addCommand(
    new Command('list')
      .description('List all config values')
      .action(() => configCommand.list())
  )
  .addCommand(
    new Command('login')
      .description('Authenticate with Halcyon Cinema')
      .action(() => configCommand.login())
  );

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err) {
  if (err instanceof Error) {
    console.error(chalk.red('Error:'), err.message);
  }
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.bold.cyan('\n  StoryForge CLI\n'));
  console.log('  Write stories from the command line with AI assistance.\n');
  program.outputHelp();
}
