const path = require('path');
const fs = require('fs');

const AGENTS_SOURCE = path.join(__dirname, '..', 'agents');
const AGENT_FILES = [
  'bard-orchestrator.md',
  'wizard-architect.md',
  'warrior-swe.md',
  'inquisitor-qa.md',
  'oracle-pm.md',
];

function install(targetDir) {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');

  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const results = [];

  for (const file of AGENT_FILES) {
    const src = path.join(AGENTS_SOURCE, file);
    const dest = path.join(agentsDir, file);

    if (fs.existsSync(dest)) {
      results.push({ file, status: 'skipped' });
      continue;
    }

    fs.copyFileSync(src, dest);
    results.push({ file, status: 'installed' });
  }

  return results;
}

function scaffoldMyriadDocs(targetDir) {
  const dirs = ['myriad-docs', 'myriad-docs/exploration', 'myriad-docs/sdds'];
  const created = [];
  for (const dir of dirs) {
    const full = path.join(targetDir, dir);
    fs.mkdirSync(full, { recursive: true });
    created.push(full);
  }
  return created;
}

if (require.main === module) {
  const targetDir = process.env.INIT_CWD || process.cwd();
  const results = install(targetDir);

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

module.exports = { install, scaffoldMyriadDocs };
