#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { scaffoldMyriadDocs } = require('../scripts/install.js');

const AGENTS_SOURCE = path.join(__dirname, '..', 'agents');
const AGENT_FILES = [
  'bard-orchestrator.md',
  'wizard-architect.md',
  'warrior-swe.md',
  'inquisitor-qa.md',
  'oracle-pm.md',
];

function log(...args) {
  console.log('[myriad-init]', ...args);
}

function copyAgents(targetDir, force) {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');

  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    log(`Created ${agentsDir}`);
  }

  let copied = 0;
  let skipped = 0;

  for (const file of AGENT_FILES) {
    const src = path.join(AGENTS_SOURCE, file);
    const dest = path.join(agentsDir, file);

    if (fs.existsSync(dest) && !force) {
      log(`Skipped ${file} (already exists, use --force to overwrite)`);
      skipped++;
      continue;
    }

    fs.copyFileSync(src, dest);
    log(`Installed ${file}`);
    copied++;
  }

  return { copied, skipped };
}

function ensureConfig(targetDir) {
  const configPath = path.join(targetDir, 'opencode.json');

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.default_agent !== 'oracle-pm') {
      config.default_agent = 'oracle-pm';
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      log(`Updated default_agent in ${configPath}`);
    }
    return;
  }

  const config = {
    $schema: 'https://opencode.ai/config.json',
    default_agent: 'oracle-pm',
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  log(`Created ${configPath}`);
}

function printNextSteps() {
  console.log('');
  log('Myriad Loop agents installed successfully!');
  console.log('');
  log('To get started, open opencode and run: @oracle-pm <to discuss your project requirements>');
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const targetDir = process.cwd();

  if (!fs.existsSync(AGENTS_SOURCE)) {
    console.error(
      `[myriad-init] ERROR: Agents directory not found at ${AGENTS_SOURCE}. Is the package installed correctly?`
    );
    process.exit(1);
  }

  log(`Installing agents to ${targetDir}`);
  const { copied, skipped } = copyAgents(targetDir, force);

  if (copied === 0 && skipped === AGENT_FILES.length) {
    log('All agents are already installed. Use --force to overwrite.');
  }

  if (copied > 0 || skipped > 0) {
    console.log('');
    log(`Summary: ${copied} installed, ${skipped} skipped`);
  }

  const dirs = scaffoldMyriadDocs(targetDir);
  log(`Scaffolded ${dirs.length} myriad-docs directories`);

  ensureConfig(targetDir);
  printNextSteps();
}

main();
