/**
 * Init Command
 * Initialize a new StoryForge project
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { getConfig, ensureAuthenticated } from '../utils/config.js';

interface InitOptions {
  name?: string;
  genre?: string;
  directory?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n  Initialize StoryForge Project\n'));

  // Ensure authenticated
  const config = getConfig();
  if (!config.get('apiKey') && !config.get('accessToken')) {
    console.log(chalk.yellow('Not authenticated. Run `storyforge config login` first.'));
    return;
  }

  // Interactive prompts if not provided
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: options.name || 'My Story',
      when: !options.name,
    },
    {
      type: 'list',
      name: 'genre',
      message: 'Genre:',
      choices: [
        'Fantasy',
        'Science Fiction',
        'Mystery',
        'Thriller',
        'Romance',
        'Literary Fiction',
        'Horror',
        'Historical Fiction',
        'Young Adult',
        'Other',
      ],
      default: options.genre,
      when: !options.genre,
    },
    {
      type: 'input',
      name: 'logline',
      message: 'Logline (one sentence summary):',
    },
    {
      type: 'number',
      name: 'targetWordCount',
      message: 'Target word count:',
      default: 80000,
    },
  ]);

  const projectName = options.name || answers.name;
  const genre = options.genre || answers.genre;
  const directory = options.directory || '.';
  const projectDir = path.join(directory, projectName.toLowerCase().replace(/\s+/g, '-'));

  const spinner = ora('Creating project...').start();

  try {
    // Create project directory structure
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'chapters'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'canon'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'exports'), { recursive: true });

    // Create project config file
    const projectConfig = {
      name: projectName,
      genre,
      logline: answers.logline || '',
      targetWordCount: answers.targetWordCount || 80000,
      mode: 'storyforge',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      settings: {
        autoSave: true,
        aiSuggestions: true,
        canonEnforcement: 'strict',
      },
    };

    await fs.writeFile(
      path.join(projectDir, 'storyforge.json'),
      JSON.stringify(projectConfig, null, 2)
    );

    // Create initial chapter
    await fs.writeFile(
      path.join(projectDir, 'chapters', '001-chapter-one.md'),
      `# Chapter One\n\nBegin your story here...\n`
    );

    // Create canon template files
    await fs.writeFile(
      path.join(projectDir, 'canon', 'characters.json'),
      JSON.stringify({ characters: [] }, null, 2)
    );
    await fs.writeFile(
      path.join(projectDir, 'canon', 'locations.json'),
      JSON.stringify({ locations: [] }, null, 2)
    );
    await fs.writeFile(
      path.join(projectDir, 'canon', 'rules.json'),
      JSON.stringify({ rules: [] }, null, 2)
    );

    // Create .gitignore
    await fs.writeFile(
      path.join(projectDir, '.gitignore'),
      `# StoryForge
.storyforge-cache/
exports/
*.backup
.env
`
    );

    // Create README
    await fs.writeFile(
      path.join(projectDir, 'README.md'),
      `# ${projectName}

${genre} | ${answers.logline || 'A story in progress...'}

## Structure

- \`chapters/\` - Your manuscript chapters
- \`canon/\` - Character, location, and world-building data
- \`exports/\` - Generated export files
- \`storyforge.json\` - Project configuration

## Commands

\`\`\`bash
# Generate content
storyforge generate continue

# Manage canon
storyforge canon list
storyforge canon add character "John Doe"

# Export
storyforge export markdown -o manuscript.md
\`\`\`
`
    );

    spinner.succeed(chalk.green('Project created successfully!'));

    console.log('\n  Project location:', chalk.cyan(projectDir));
    console.log('\n  Next steps:');
    console.log(chalk.gray('  1.'), `cd ${projectDir}`);
    console.log(chalk.gray('  2.'), 'storyforge canon add character "Your Protagonist"');
    console.log(chalk.gray('  3.'), 'Start writing in chapters/001-chapter-one.md');
    console.log(chalk.gray('  4.'), 'storyforge generate continue');
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}
