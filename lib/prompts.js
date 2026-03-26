import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

let rl = null;

function getRL() {
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }
  return rl;
}

export function closeRL() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

export async function confirm(question, defaultYes = false, useDefaults = false) {
  if (useDefaults) return defaultYes;
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await getRL().question(`${question} ${hint} `);
  if (!answer.trim()) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}

export async function select(prompt, options, defaultValue, useDefaults = false) {
  if (useDefaults) return defaultValue;

  console.log(`\n${prompt}`);
  for (const opt of options) {
    const marker = opt.value === defaultValue ? ' (default)' : '';
    console.log(`  [${opt.key}] ${opt.label}${marker}`);
  }

  const answer = await getRL().question('  Choice: ');
  const trimmed = answer.trim().toLowerCase();
  const match = options.find(o => o.key.toLowerCase() === trimmed);
  return match ? match.value : defaultValue;
}

export async function multiConfirm(header, items, useDefaults = false) {
  if (header) console.log(`\n${header}`);
  const selected = [];
  for (const item of items) {
    const yes = await confirm(`  ${item.label}`, item.defaultYes || false, useDefaults);
    if (yes) selected.push(item.value);
  }
  return selected;
}
