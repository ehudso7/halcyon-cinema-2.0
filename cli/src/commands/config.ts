/**
 * Config Commands
 * Manage CLI configuration
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfig } from '../utils/config.js';

export const configCommand = {
  set(key: string, value: string): void {
    const config = getConfig();
    const validKeys = ['apiKey', 'anthropicApiKey', 'supabaseUrl', 'supabaseKey', 'defaultMode'];

    if (!validKeys.includes(key)) {
      console.log(chalk.yellow(`Unknown config key. Valid keys: ${validKeys.join(', ')}`));
      return;
    }

    // Mask sensitive values in display
    const displayValue = key.toLowerCase().includes('key') ? '***' : value;

    config.set(key, value);
    console.log(chalk.green(`Set ${key} = ${displayValue}`));
  },

  get(key: string): void {
    const config = getConfig();
    const value = config.get(key);

    if (value === undefined) {
      console.log(chalk.gray(`${key} is not set`));
    } else {
      // Mask sensitive values
      const displayValue = key.toLowerCase().includes('key') ? '***' : value;
      console.log(`${key} = ${displayValue}`);
    }
  },

  list(): void {
    const config = getConfig();
    const allConfig = config.store;

    console.log(chalk.bold.cyan('\n  Configuration\n'));

    if (Object.keys(allConfig).length === 0) {
      console.log(chalk.gray('  No configuration set.'));
      console.log(chalk.gray('  Run `storyforge config login` to get started.'));
    } else {
      for (const [key, value] of Object.entries(allConfig)) {
        const displayValue = key.toLowerCase().includes('key') ? '***' : value;
        console.log(`  ${key}: ${displayValue}`);
      }
    }
    console.log('');
  },

  async login(): Promise<void> {
    console.log(chalk.bold.cyan('\n  Login to Halcyon Cinema\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to authenticate?',
        choices: [
          { name: 'API Key (recommended for CLI)', value: 'apiKey' },
          { name: 'Email & Password', value: 'email' },
        ],
      },
    ]);

    if (answers.method === 'apiKey') {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your API key:',
          mask: '*',
        },
      ]);

      if (!apiKey) {
        console.log(chalk.yellow('No API key provided.'));
        return;
      }

      const config = getConfig();
      config.set('apiKey', apiKey);

      console.log(chalk.green('\n  API key saved!'));
      console.log(chalk.gray('  You can now use the CLI to manage your projects.'));
    } else {
      const credentials = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
        },
      ]);

      // In a real implementation, this would authenticate with Supabase
      console.log(chalk.yellow('\n  Email/password login requires the full platform.'));
      console.log(chalk.yellow('  Please use an API key instead.'));
      console.log(chalk.gray('  Generate an API key at: https://halcyon.cinema/settings/api'));
    }
    console.log('');

    // Prompt for Anthropic key too
    const { wantAnthropic } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantAnthropic',
        message: 'Would you like to set up AI generation (requires Anthropic API key)?',
        default: true,
      },
    ]);

    if (wantAnthropic) {
      const { anthropicKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'anthropicKey',
          message: 'Enter your Anthropic API key:',
          mask: '*',
        },
      ]);

      if (anthropicKey) {
        const config = getConfig();
        config.set('anthropicApiKey', anthropicKey);
        console.log(chalk.green('  Anthropic API key saved!'));
      }
    }

    console.log(chalk.green('\n  Setup complete!'));
    console.log(chalk.gray('  Run `storyforge init` to create a new project.'));
    console.log('');
  },
};
