import { existsSync, mkdirSync, readdirSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { info, warn, copyFile, copyDir, commandExists } from './utils.js';

function findInProject(projectDir, name, maxDepth = 2) {
  function search(dir, depth) {
    if (depth > maxDepth) return false;
    try {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'vendor') continue;
        const full = join(dir, entry);
        if (entry === name) return true;
        try {
          if (statSync(full).isDirectory() && depth < maxDepth) {
            if (search(full, depth + 1)) return true;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return false;
  }
  return search(projectDir, 0);
}

export function scaffoldDocs(projectDir, packagesDir, mode) {
  mkdirSync(join(projectDir, 'docs', 'architecture'), { recursive: true });
  mkdirSync(join(projectDir, 'docs', 'trees'), { recursive: true });

  const tmplDir = join(packagesDir, 'core', 'docs-templates', 'architecture');
  let tmplCount = 0;

  if (existsSync(tmplDir)) {
    tmplCount = copyDir(tmplDir, join(projectDir, 'docs', 'architecture'), mode, '.md');
    info(`Copied ${tmplCount} architecture doc templates → docs/architecture/`);

    let removed = 0;

    if (!existsSync(join(projectDir, 'go.mod')) && !findInProject(projectDir, 'go.mod')) {
      const p = join(projectDir, 'docs', 'architecture', 'backend-layers.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    if (!findInProject(projectDir, 'package.json')) {
      const p = join(projectDir, 'docs', 'architecture', 'frontend-state.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    if (!findInProject(projectDir, 'migrations', 3) && !findInProject(projectDir, 'schema.prisma')) {
      const p = join(projectDir, 'docs', 'architecture', 'database-schema.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    if (!findInProject(projectDir, 'Dockerfile') && !findInProject(projectDir, 'docker-compose.yml')) {
      const p = join(projectDir, 'docs', 'architecture', 'deployment.md');
      if (existsSync(p)) { rmSync(p); removed++; }
    }

    if (removed > 0) {
      info(`Removed ${removed} irrelevant templates (auto-detected)`);
    }
  } else {
    info('Created docs/architecture/ and docs/trees/ directories');
  }

  generateTree(projectDir);
}

function generateTree(projectDir) {
  const treePath = join(projectDir, 'docs', 'trees', 'tree-project.md');
  const date = new Date().toISOString().slice(0, 10);
  let treeContent;

  if (commandExists('tree')) {
    try {
      treeContent = execSync(
        `tree "${projectDir}" -I 'node_modules|.git|__pycache__|vendor|dist|build|.next|.cache|*.pyc|.DS_Store' --dirsfirst -L 3`,
        { stdio: 'pipe', maxBuffer: 1024 * 1024 }
      ).toString();
    } catch {
      treeContent = generateFallbackTree(projectDir);
    }
  } else {
    treeContent = generateFallbackTree(projectDir);
  }

  const content = [
    '# Project Tree',
    `> Auto-generated on ${date}. Regenerate with tree-generator agent.`,
    '',
    '```',
    treeContent.trimEnd(),
    '```',
    ''
  ].join('\n');

  writeFileSync(treePath, content);
  info('Generated project tree → docs/trees/tree-project.md');
}

function generateFallbackTree(rootDir, maxDepth = 3) {
  const IGNORE = new Set([
    'node_modules', '.git', '__pycache__', 'vendor', 'dist',
    'build', '.next', '.cache', '.DS_Store'
  ]);

  const lines = [];
  let count = 0;
  const MAX_ENTRIES = 100;

  function walk(dir, prefix, depth) {
    if (depth > maxDepth || count >= MAX_ENTRIES) return;
    let entries;
    try {
      entries = readdirSync(dir).filter(e => !IGNORE.has(e) && !e.endsWith('.pyc')).sort();
    } catch { return; }

    const dirs = entries.filter(e => {
      try { return statSync(join(dir, e)).isDirectory(); } catch { return false; }
    });
    const files = entries.filter(e => {
      try { return statSync(join(dir, e)).isFile(); } catch { return false; }
    });
    const sorted = [...dirs, ...files];

    for (let i = 0; i < sorted.length && count < MAX_ENTRIES; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      lines.push(`${prefix}${connector}${entry}`);
      count++;

      const full = join(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          walk(full, prefix + childPrefix, depth + 1);
        }
      } catch { /* skip */ }
    }
  }

  lines.push('.');
  walk(rootDir, '', 0);
  return lines.join('\n');
}
