/**
 * Export Command
 * Export project to various formats
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

interface ExportOptions {
  output?: string;
  chapters?: string;
}

interface Chapter {
  path: string;
  number: number;
  title: string;
  content: string;
}

async function loadChapters(): Promise<Chapter[]> {
  const chaptersDir = path.join(process.cwd(), 'chapters');
  const files = await fs.readdir(chaptersDir);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort();

  const chapters: Chapter[] = [];

  for (let i = 0; i < mdFiles.length; i++) {
    const filePath = path.join(chaptersDir, mdFiles[i]);
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract title from first heading or filename
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : mdFiles[i].replace('.md', '');

    chapters.push({
      path: filePath,
      number: i + 1,
      title,
      content,
    });
  }

  return chapters;
}

async function loadProjectConfig(): Promise<{ name: string; genre?: string; logline?: string } | null> {
  try {
    const configPath = path.join(process.cwd(), 'storyforge.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function exportCommand(format: string, options: ExportOptions): Promise<void> {
  const validFormats = ['docx', 'pdf', 'epub', 'fountain', 'markdown', 'json'];

  if (!validFormats.includes(format)) {
    console.log(chalk.red(`Invalid format. Must be one of: ${validFormats.join(', ')}`));
    return;
  }

  const spinner = ora('Preparing export...').start();

  try {
    const projectConfig = await loadProjectConfig();
    let chapters = await loadChapters();

    // Filter chapters if specified
    if (options.chapters) {
      const chapterNums = options.chapters.split(',').map(n => parseInt(n.trim()));
      chapters = chapters.filter(c => chapterNums.includes(c.number));
    }

    if (chapters.length === 0) {
      spinner.fail(chalk.red('No chapters to export'));
      return;
    }

    const projectName = projectConfig?.name || 'Untitled';
    const outputPath = options.output || path.join(
      process.cwd(),
      'exports',
      `${projectName.toLowerCase().replace(/\s+/g, '-')}.${format}`
    );

    // Ensure exports directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    spinner.text = `Exporting to ${format}...`;

    let output: string;

    switch (format) {
      case 'markdown':
        output = generateMarkdown(projectConfig, chapters);
        break;
      case 'json':
        output = JSON.stringify({ project: projectConfig, chapters }, null, 2);
        break;
      case 'fountain':
        output = generateFountain(projectConfig, chapters);
        break;
      default:
        // For docx, pdf, epub - we'd need additional libraries
        // For CLI, just generate markdown with a note
        output = generateMarkdown(projectConfig, chapters);
        console.log(chalk.yellow(`\n  Note: ${format} export requires the full platform.`));
        console.log(chalk.yellow('  Generating markdown as fallback.\n'));
        break;
    }

    await fs.writeFile(outputPath, output);

    spinner.succeed(chalk.green('Export complete!'));
    console.log(chalk.gray(`  File: ${outputPath}`));
    console.log(chalk.gray(`  Chapters: ${chapters.length}`));
    console.log(chalk.gray(`  Format: ${format}`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Export failed'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

function generateMarkdown(
  project: { name: string; genre?: string; logline?: string } | null,
  chapters: Chapter[]
): string {
  const lines: string[] = [];

  // Title page
  lines.push(`# ${project?.name || 'Untitled'}`);
  if (project?.genre) {
    lines.push(`*${project.genre}*`);
  }
  lines.push('');
  if (project?.logline) {
    lines.push(project.logline);
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // Chapters
  for (const chapter of chapters) {
    lines.push(chapter.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function generateFountain(
  project: { name: string } | null,
  chapters: Chapter[]
): string {
  const lines: string[] = [];

  // Title page
  lines.push(`Title: ${project?.name || 'Untitled'}`);
  lines.push('');
  lines.push('===');
  lines.push('');

  // Convert chapters to scenes
  for (const chapter of chapters) {
    // Simple conversion - real implementation would parse dialogue, action, etc.
    lines.push(`INT. ${chapter.title.toUpperCase()} - DAY`);
    lines.push('');

    // Strip markdown headings
    const content = chapter.content.replace(/^#+\s+.+$/gm, '').trim();
    lines.push(content);
    lines.push('');
  }

  return lines.join('\n');
}
