const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const AGENTS_SOURCE = path.join(__dirname, '..', 'agents');
const AGENT_FILES = [
  'bard-orchestrator.md',
  'wizard-architect.md',
  'warrior-swe.md',
  'inquisitor-qa.md',
  'oracle-pm.md',
  'herald-feature.md',
];

const SKILLS_SOURCE = path.join(__dirname, '..', 'skills');
const SKILL_DIRS = ['caveman'];

function install(targetDir, force) {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');

  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const results = [];

  for (const file of AGENT_FILES) {
    const src = path.join(AGENTS_SOURCE, file);
    const dest = path.join(agentsDir, file);

    if (fs.existsSync(dest) && !force) {
      results.push({ file, status: 'skipped' });
      continue;
    }

    fs.copyFileSync(src, dest);
    results.push({ file, status: 'installed' });
  }

  const skillResults = installSkills(targetDir, force);
  for (const r of skillResults) {
    results.push({ file: `${r.file}/`, status: r.status, kind: 'skill' });
  }

  return results;
}

function installSkills(targetDir, force) {
  const skillsDir = path.join(targetDir, '.opencode', 'skills');

  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const results = [];

  for (const name of SKILL_DIRS) {
    const srcDir = path.join(SKILLS_SOURCE, name);
    const destDir = path.join(skillsDir, name);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const entries = fs.readdirSync(srcDir);
    let installedAny = false;

    for (const entry of entries) {
      const src = path.join(srcDir, entry);
      const dest = path.join(destDir, entry);

      if (fs.existsSync(dest) && !force) {
        continue;
      }

      fs.copyFileSync(src, dest);
      installedAny = true;
    }

    results.push({ file: name, status: installedAny ? 'installed' : 'skipped' });
  }

  return results;
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function link(targetDir) {
  const opencodeDir = path.join(targetDir, '.opencode');
  const linkPath = path.join(opencodeDir, 'agents');
  const target = path.relative(opencodeDir, AGENTS_SOURCE);

  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }

  if (isSymlink(linkPath)) {
    fs.unlinkSync(linkPath);
  } else if (fs.existsSync(linkPath)) {
    return { linked: false, reason: `${linkPath} exists and is not a symlink (use install instead)` };
  }

  fs.symlinkSync(target, linkPath, 'dir');
  return { linked: true, linkPath, target };
}

function unlink(targetDir) {
  const linkPath = path.join(targetDir, '.opencode', 'agents');

  if (isSymlink(linkPath)) {
    fs.unlinkSync(linkPath);
    return { unlinked: true, linkPath };
  }

  if (fs.existsSync(linkPath)) {
    return { unlinked: false, reason: `${linkPath} is not a symlink (remove manually)` };
  }

  return { unlinked: false, reason: `${linkPath} does not exist` };
}

function scaffoldMyriadDocs(targetDir) {
  const dirs = [
    'myriad-docs',
    'myriad-docs/exploration',
    'myriad-docs/sdds',
    'myriad-docs/reports',
  ];
  const created = [];
  for (const dir of dirs) {
    const full = path.join(targetDir, dir);
    fs.mkdirSync(full, { recursive: true });
    created.push(full);
  }
  return created;
}

function setupContext7(targetDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['ctx7', 'setup'], {
      cwd: targetDir,
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => resolve(code));
    proc.on('error', (err) => reject(err));
  });
}

if (require.main === module) {
  const targetDir = process.env.INIT_CWD || process.cwd();
  const force = process.argv.includes('--force');
  const results = install(targetDir, force);

  console.log('[myriad-loop-agents] Installation results:');
  for (const r of results) {
    console.log(`  ${r.status === 'installed' ? '+' : '-'} ${r.file} (${r.status})`);
  }

  const dirs = scaffoldMyriadDocs(targetDir);
  console.log('[myriad-loop-agents] Scaffolded directories:');
  for (const d of dirs) {
    console.log(`  + ${d}`);
  }
}

module.exports = { AGENT_FILES, SKILL_DIRS, install, installSkills, link, unlink, scaffoldMyriadDocs, setupContext7 };
