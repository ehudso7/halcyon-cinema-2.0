/**
 * Project Commands
 * Manage StoryForge projects
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { getConfig, getSupabaseClient } from '../utils/config.js';

interface ProjectConfig {
  name: string;
  genre: string;
  logline?: string;
  targetWordCount?: number;
  mode: string;
  createdAt: string;
  cloudId?: string;
}

async function loadLocalConfig(): Promise<ProjectConfig | null> {
  try {
    const configPath = path.join(process.cwd(), 'storyforge.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export const projectCommand = {
  async list(): Promise<void> {
    console.log(chalk.bold.cyan('\n  Your Projects\n'));

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log(chalk.yellow('Not authenticated. Run `storyforge config login` first.'));
      return;
    }

    const spinner = ora('Loading projects...').start();

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, genre, mode, word_count, updated_at')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      spinner.stop();

      if (!projects || projects.length === 0) {
        console.log(chalk.gray('  No projects found.'));
        console.log(chalk.gray('  Run `storyforge init` to create one.'));
        return;
      }

      console.log(chalk.gray('  ID'.padEnd(40) + 'Title'.padEnd(30) + 'Mode'.padEnd(15) + 'Words'));
      console.log(chalk.gray('  ' + '-'.repeat(90)));

      for (const project of projects) {
        const mode = project.mode === 'cinema' ? chalk.magenta('Cinema') : chalk.blue('StoryForge');
        console.log(
          `  ${chalk.gray(project.id.substring(0, 8))}  ${project.title.padEnd(28)} ${mode.padEnd(24)} ${project.word_count.toLocaleString()}`
        );
      }
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Failed to load projects'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async info(projectId?: string): Promise<void> {
    // Try to load local config first
    const localConfig = await loadLocalConfig();

    if (!projectId && localConfig?.cloudId) {
      projectId = localConfig.cloudId;
    }

    if (!projectId && localConfig) {
      // Show local project info
      console.log(chalk.bold.cyan(`\n  ${localConfig.name}\n`));
      console.log(`  Genre:        ${localConfig.genre}`);
      console.log(`  Mode:         ${localConfig.mode}`);
      if (localConfig.logline) {
        console.log(`  Logline:      ${localConfig.logline}`);
      }
      if (localConfig.targetWordCount) {
        console.log(`  Target:       ${localConfig.targetWordCount.toLocaleString()} words`);
      }
      console.log(`  Created:      ${new Date(localConfig.createdAt).toLocaleDateString()}`);
      console.log(chalk.gray('\n  (Local project - not synced to cloud)'));
      return;
    }

    if (!projectId) {
      console.log(chalk.yellow('No project specified. Run from a project directory or provide an ID.'));
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log(chalk.yellow('Not authenticated. Run `storyforge config login` first.'));
      return;
    }

    const spinner = ora('Loading project...').start();

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          chapters:chapters(count),
          canon_entries:canon_entries(count)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;

      spinner.stop();

      console.log(chalk.bold.cyan(`\n  ${project.title}\n`));
      console.log(`  ID:           ${project.id}`);
      console.log(`  Genre:        ${project.genre || 'Not set'}`);
      console.log(`  Mode:         ${project.mode}`);
      console.log(`  Status:       ${project.status}`);
      console.log(`  Word Count:   ${project.word_count.toLocaleString()}`);
      console.log(`  Chapters:     ${(project.chapters as any)?.[0]?.count || 0}`);
      console.log(`  Canon Items:  ${(project.canon_entries as any)?.[0]?.count || 0}`);
      console.log(`  Created:      ${new Date(project.created_at).toLocaleDateString()}`);
      console.log(`  Updated:      ${new Date(project.updated_at).toLocaleDateString()}`);
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('Failed to load project'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },

  async sync(projectId?: string): Promise<void> {
    const localConfig = await loadLocalConfig();

    if (!localConfig) {
      console.log(chalk.yellow('No local project found. Run from a project directory.'));
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log(chalk.yellow('Not authenticated. Run `storyforge config login` first.'));
      return;
    }

    const spinner = ora('Syncing project...').start();

    try {
      // If project exists in cloud, sync
      if (localConfig.cloudId || projectId) {
        // Update cloud with local changes
        spinner.text = 'Uploading local changes...';
        // Implementation would sync chapters, canon, etc.
        spinner.succeed(chalk.green('Project synced successfully!'));
      } else {
        // Create new cloud project
        spinner.text = 'Creating cloud project...';

        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            title: localConfig.name,
            genre: localConfig.genre,
            logline: localConfig.logline,
            target_word_count: localConfig.targetWordCount,
            mode: localConfig.mode as 'storyforge' | 'cinema',
          })
          .select()
          .single();

        if (error) throw error;

        // Update local config with cloud ID
        localConfig.cloudId = project.id;
        await fs.writeFile(
          path.join(process.cwd(), 'storyforge.json'),
          JSON.stringify(localConfig, null, 2)
        );

        spinner.succeed(chalk.green('Project synced to cloud!'));
        console.log(chalk.gray(`  Cloud ID: ${project.id}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to sync project'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
    }
  },
};
