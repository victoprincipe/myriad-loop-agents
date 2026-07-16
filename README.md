<img width="2752" height="1536" alt="Gemini_Generated_Image_4rua3w4rua3w4rua" src="https://github.com/user-attachments/assets/7d6f4b98-4f80-4e21-8f6b-9bf1f5e3e918" />

# Myriad loop

Myriad Loop agents for [opencode](https://opencode.ai) — an AI-native software development lifecycle orchestration system.

## What is Myriad Loop?

Myriad Loop is a structured SDLC workflow where specialized AI agents collaborate. Here is exactly how each agent works:

### 1. Oracle (PM)
- **Role:** Product Manager (Primary)
- **Input:** User interaction
- **Function:** Interacts with the user to gather requirements (Business Objective, Technology Stack, Epics). Elicits user stories, acceptance criteria, and technical constraints via targeted questions.
- **Output:** Generates a structured Exploration Brief (`myriad-docs/exploration/[PROJECT_NAME]_Brief.md`).

### 2. Bard (Orchestrator)
- **Role:** Central Coordinator (Primary)
- **Input:** User specifications or existing `myriad-docs/memory.json` state
- **Function:** Manages the overall lifecycle and state across the loop. It breaks down specs into discrete features ordered by dependency, delegates tasks to the subagents (Wizard, Warrior, Inquisitor), handles a two-tiered retry system (up to 3 retries), asks for human approvals, and executes git commits. **Crucially, it tracks progress in `memory.json` and can seamlessly resume execution from where it left off if interrupted.**
- **Output:** Updated `memory.json` state, delegated sub-tasks, and conventional git commits.

### 3. Wizard (Architect)
- **Role:** Software Architect (Subagent)
- **Input:** Exploration Brief from Oracle, codebase inventory
- **Function:** Searches the existing codebase for reusable modules. Designs the system architecture at a granular level, documenting trade-offs, explicit file layouts, data models, and error handling strategies.
- **Output:** Generates a Software Design Document (SDD) (`myriad-docs/sdds/<project-folder>/[FEATURE_NAME]_sdd.md`).

### 4. Warrior (SWE)
- **Role:** Software Engineer (Subagent)
- **Input:** SDD from the Wizard, codebase inventory
- **Function:** Explores the codebase and implements code strictly following the SDD. It handles edge cases, writes unit tests, runs linters/tests, and stages changes via `git add` without committing. No scope creep is allowed. During retries, it uses diff-based patching to fix localized bugs.
- **Output:** Staged source code, passing tests, and a structured completion report.

### 5. Herald (Feature Editor)
- **Role:** Interactive Single-Feature Orchestrator (Primary)
- **Input:** Feature description from the user
- **Function:** An interactive pair-programmer for single features. Given a feature description, it calls the Wizard (design), presents the SDD for your approval, calls the Warrior (implement), then calls the Inquisitor (QA) — asking for your consent at each step. **It does not commit code**; changes remain staged for you to review and commit yourself.
- **Output:** Staged code, passing tests, structured manifests in `myriad-docs/reports/<feature>/`, and a suggested commit message.

### 6. Inquisitor (QA)
- **Role:** QA Engineer & Code Reviewer (Subagent)
- **Input:** SDD specification, Warrior's staged changes
- **Function:** Validates the implementation against the SDD goals. Checks for scope creep, verifies code reuse, runs linters and the full test suite, and performs a code quality review. It classifies failures as either `implementation` (Warrior must fix) or `architectural` (Wizard must revise SDD), and provides line-level PR comments for localized issues.
- **Output:** A structured report with `STATUS: APPROVED` or `STATUS: REJECTED`.

## Installation

```bash
npx myriad-init
```

Or install locally — the `postinstall` hook auto-copies the agents and scaffolds `myriad-docs/` for you:

```bash
npm install -D myriad-loop
```

To re-copy or overwrite agents after an upgrade, run:

```bash
npx myriad-init --force
```

The installer interactively offers to set up **Context7 MCP** for dependency research (used by the Wizard to verify library APIs). Pass `--mcp` to opt in non-interactively, or `--no-mcp` to skip.

Either path copies the 6 agent markdown files into `.opencode/agents/` in your project and creates the `myriad-docs/exploration/`, `myriad-docs/sdds/`, and `myriad-docs/reports/` directories the agents expect.

### Developing in this repo

The agent source files live in `agents/` at the repo root. opencode only scans `.opencode/agents/`, so while editing in this repo you need the sources discoverable there. Instead of copying (which would let the two drift), run from the repo root:

```bash
npx myriad-init link
```

This creates a relative symlink `.opencode/agents` -> `../agents`, so edits to the source files are immediately live in opencode. `.opencode` is gitignored, so the symlink won't be committed. Restart opencode after linking for the agents to appear. To remove the symlink, run `npx myriad-init unlink`. On Windows, creating directory symlinks may require administrator or Developer Mode privileges.

## Usage

1. Open opencode in your project and select the **Oracle (PM)** agent.
2. Talk with the Oracle agent to discuss your project requirements. The Oracle will ask clarifying questions and generate an Exploration Brief.
3. Switch your active agent to the **Bard (Orchestrator)**.
4. Provide the generated Exploration Brief to the Bard. The Myriad Loop will then orchestrate the rest of the lifecycle: Design → Implement → QA → Commit.

For single features without a full project cycle, switch to **@herald-feature** and describe the feature. Herald walks you through design, implementation, and QA interactively, then leaves the changes staged for you to commit.

## Workflow

The Myriad Loop follows a strict, state-managed execution flow managed by the **Bard**:

```
Oracle (PM) → Bard (Orchestrator) → Wizard (Architect) → Warrior (SWE) → Inquisitor (QA)
```

Each feature goes through the following lifecycle:
1. **Requirements** — Oracle gathers requirements and writes the Exploration Brief.
2. **Orchestration** — Bard reads the Brief, identifies discrete features, and creates the `memory.json` tracking file.
3. **Design** — Bard delegates to Wizard to produce a Software Design Document (SDD) for a specific feature.
4. **Human-in-the-loop** — Bard pauses to ask for your explicit approval on the SDD.
5. **Implement** — Upon approval, Bard delegates to Warrior to write code, write tests, and stage the files exactly per the SDD.
6. **QA** — Bard delegates to Inquisitor to validate the staged changes, run tests, and check for scope creep.
7. **Evaluate & Retry** — If rejected, Bard routes the failure back to Warrior (for implementation bugs) or Wizard (for architectural flaws). A maximum of 3 retries is allowed (shared across both failure types) before escalating to the user. Each retry is recorded in the feature's `history` array in `memory.json` for traceability on resume.
8. **Commit** — Once approved by Inquisitor, Bard commits the changes using Conventional Commits and moves to the next feature.

### Herald (Interactive Single Feature)

Herald follows the same granular flow but runs interactively with a single feature, asking for your approval at every gate:

```
Herald → Wizard → [Your Approval] → Warrior → [Your OK] → Inquisitor → [You Review Staged Code]
```

Herald does **not** commit — it leaves all changes staged for your review.

## Brief Frontmatter

The Oracle now writes **YAML frontmatter** at the top of the Exploration Brief with structured fields (`project_name`, `technology_stack`, `features` with user stories, acceptance criteria, etc.). The Bard reads `project_name` from the frontmatter to determine the SDD folder path. The Wizard parses the structured fields directly instead of scraping markdown.

## Greenfield Safety

The Inquisitor now detects missing test/lint harnesses (no `scripts.test`, no `pytest` config, etc.) and reports `SETUP MISSING` instead of treating it as a failure. This allows the first feature in a new project to bootstrap the test stack without false rejections.

## Typed Report Manifests

Subagents now write JSON manifest files to `myriad-docs/reports/<feature>/` after each phase:
- `wizard.json` — SDD paths and dependencies
- `warrior.json` — created/modified files and test results
- `inquisitor.json` — validation results, line-level failures, and retry history

The Bard reads these manifests for structured decision-making, reducing parsing brittleness.

## License

MIT
