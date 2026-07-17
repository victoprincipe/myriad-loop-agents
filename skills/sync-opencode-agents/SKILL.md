---
name: sync-opencode-agents
description: >-
  Use ONLY when the user modifies files in the `agents/` directory (adds,
  edits, or deletes agent markdown files there). Not for changes in any other
  directory. Syncs those changes to `.opencode/agents/` so opencode always
  uses the latest agent definitions.
---

# Sync Agents

Synchronize `agents/` → `.opencode/agents/` so opencode picks up agent changes.

## Workflow

### 1. Show what changed

```bash
diff -rq agents/ .opencode/agents/
```

### 2. Sync (copy new/modified, delete removed)

```bash
rsync -a --delete agents/ .opencode/agents/
```

### 3. Verify

```bash
diff -rq agents/ .opencode/agents/
```

Report which files were added, modified, or deleted.
