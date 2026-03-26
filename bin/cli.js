#!/usr/bin/env node

import { install } from '../lib/installer.js';
import { closeRL } from '../lib/prompts.js';

const VERSION = '1.3.3';

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    version: VERSION,
    defaults: false,
    stacks: null,
    extras: null,
    profile: null,
    plugins: null,
    codex: null,
    noDocs: false,
    noSuperpowers: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--version' || arg === '-v') {
      console.log(`claude-code-superkit v${VERSION}`);
      process.exit(0);
    }
    if (arg === '--defaults') {
      opts.defaults = true;
      continue;
    }
    if (arg === '--codex') {
      opts.codex = true;
      continue;
    }
    if (arg === '--no-docs') {
      opts.noDocs = true;
      continue;
    }
    if (arg === '--no-superpowers') {
      opts.noSuperpowers = true;
      continue;
    }
    if (arg.startsWith('--stacks=')) {
      opts.stacks = arg.split('=')[1].split(',').map(s => {
        const map = { go: 'go', ts: 'typescript', typescript: 'typescript', py: 'python', python: 'python', rust: 'rust' };
        return map[s.toLowerCase()] || s.toLowerCase();
      });
      continue;
    }
    if (arg.startsWith('--profile=')) {
      opts.profile = arg.split('=')[1].toLowerCase();
      if (!['fast', 'standard', 'strict'].includes(opts.profile)) {
        console.error(`Unknown profile: ${opts.profile}. Use: fast, standard, strict`);
        process.exit(1);
      }
      continue;
    }
    if (arg.startsWith('--extras=')) {
      opts.extras = arg.split('=')[1].split(',').map(s => {
        const map = { bot: 'bot-reviewer', design: 'design-system-reviewer' };
        return map[s.toLowerCase()] || s.toLowerCase();
      });
      continue;
    }
    if (arg.startsWith('--plugins=')) {
      opts.plugins = arg.split('=')[1].split(',');
      continue;
    }

    console.error(`Unknown option: ${arg}`);
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`
claude-code-superkit v${VERSION} — interactive installer

Usage:
  npx claude-code-superkit [options]

Options:
  --defaults              Use default settings, no interactive prompts
  --stacks=go,ts,py,rust  Select language stacks (comma-separated)
  --profile=standard      Hook profile: fast, standard, strict
  --extras=bot,design     Select extras (comma-separated)
  --plugins=playwright    Optional plugins (comma-separated)
  --codex                 Also install for Codex CLI
  --no-docs               Skip documentation scaffolding
  --no-superpowers        Skip superpowers plugin installation
  --help, -h              Show this help
  --version, -v           Show version

Examples:
  npx claude-code-superkit                          # Interactive
  npx claude-code-superkit --defaults               # All defaults
  npx claude-code-superkit --stacks=go,ts --codex   # Go + TypeScript + Codex

Run from your project root (must be a git repository).
Requires: Node.js 18+, git. Recommended: claude CLI.
`);
}

async function main() {
  const opts = parseArgs(process.argv);

  try {
    await install(opts);
  } catch (err) {
    if (err.code === 'ERR_USE_AFTER_CLOSE' || (err.message && err.message.includes('readline was closed'))) {
      console.log('\nNon-interactive input detected. Re-running with --defaults...\n');
      opts.defaults = true;
      await install(opts);
    } else {
      console.error(`\n✗ Error: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  } finally {
    closeRL();
  }
}

main();
