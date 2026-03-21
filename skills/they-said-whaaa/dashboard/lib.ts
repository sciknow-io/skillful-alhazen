import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(process.cwd());
const SCRIPT = path.join(PROJECT_ROOT, '.claude/skills/they-said-whaaa/they_said_whaaa.py');

async function runTsw(args: string[]): Promise<unknown> {
  const { stdout } = await execFileAsync(
    'uv',
    ['run', 'python', SCRIPT, ...args],
    {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, TYPEDB_DATABASE: 'alhazen_notebook' },
    }
  );
  return JSON.parse(stdout);
}

export async function listFigures() {
  return runTsw(['list-figures']);
}

export async function getFigure(id: string) {
  return runTsw(['show-figure', '--id', id]);
}

export async function listTopics() {
  return runTsw(['list-topics']);
}

export async function listContradictions(figureId?: string) {
  const args = ['list-contradictions'];
  if (figureId) args.push('--figure-id', figureId);
  return runTsw(args);
}

export async function getTimeline(figureId: string, topicId?: string) {
  const args = ['get-timeline', '--figure-id', figureId];
  if (topicId) args.push('--topic-id', topicId);
  return runTsw(args);
}
