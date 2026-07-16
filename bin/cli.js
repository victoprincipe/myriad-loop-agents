#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const { scaffoldMyriadDocs, setupContext7, AGENT_FILES, link, unlink } = require('../scripts/install.js');

const AGENTS_SOURCE = path.join(__dirname, '..', 'agents');

function log(...args) {
  console.log('[myriad-init]', ...args);
}

function isLink(argv) {
  return argv.includes('link') || argv.includes('--link');
}

function isUnlink(argv) {
  return argv.includes('unlink') || argv.includes('--unlink');
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

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }

  if (!config.default_agent) {
    config.default_agent = 'oracle-pm';
    log(`Set default_agent to 'oracle-pm' in ${configPath}`);
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  if (!fs.existsSync(configPath)) {
    log(`Created ${configPath}`);
  }
}

function askContext7() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      '[myriad-init] Add Context7 MCP server for dependency research? (runs npx ctx7 setup) [y/N] ',
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
      },
    );
  });
}

function printNextSteps() {
  console.log('');
  log('Myriad Loop agents installed successfully!');
  console.log('');
  log('To get started, open opencode and run: @oracle-pm <to discuss your project requirements>');
  console.log('');
  log('For single-feature interactive development, use: @herald-feature');
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const hasMcpFlag = args.includes('--mcp');
  const hasNoMcpFlag = args.includes('--no-mcp');
  const targetDir = process.cwd();

  if (!fs.existsSync(AGENTS_SOURCE)) {
    console.error(
      `[myriad-init] ERROR: Agents directory not found at ${AGENTS_SOURCE}. Is the package installed correctly?`,
    );
    process.exit(1);
  }

  if (isUnlink(args)) {
    const res = unlink(targetDir);
    if (res.unlinked) {
      log(`Removed symlink ${res.linkPath}`);
    } else {
      log(`Could not unlink: ${res.reason}`);
    }
    return;
  }

  if (isLink(args)) {
    const res = link(targetDir);
    if (res.linked) {
      console.log('');
      log(`Linked ${res.linkPath} -> ${res.target}`);
      log('Source edits in agents/ are now live in opencode.');
      log('Note: .opencode is gitignored, so the symlink is not committed.');
      log('Restart opencode to load the agents.');
      const dirs = scaffoldMyriadDocs(targetDir);
      log(`Scaffolded ${dirs.length} myriad-docs directories`);
      ensureConfig(targetDir);
      printNextSteps();
    } else {
      log(`Could not link: ${res.reason}`);
    }
    return;
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

  let runContext7 = false;
  if (hasMcpFlag) {
    runContext7 = true;
  } else if (!hasNoMcpFlag && process.stdin.isTTY) {
    runContext7 = await askContext7();
  } else if (!hasNoMcpFlag) {
    log('Skipping Context7 setup (non-interactive). Use --mcp flag to enable.');
  }

  if (runContext7) {
    log('Running npx ctx7 setup...');
    const code = await setupContext7(targetDir);
    if (code === 0) {
      log('Context7 MCP configured successfully.');
    } else {
      log(`npx ctx7 setup exited with code ${code}. You can re-run manually later.`);
    }
  }

  ensureConfig(targetDir);
  printNextSteps();
}

main();
