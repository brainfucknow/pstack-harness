---
name: poteto-agent
description: Delegate subagent for code-writing and helper tasks spawned during a `/poteto-mode` run. Use for delegates, not as the runner for `/poteto-mode` itself. Spawn a fresh `poteto-agent` for each new task, and resume one only in the strict cases that poteto-mode's Subagents section names. Reads the `poteto-mode` skill's `SKILL.md` in full before any work, including its inline Principles index. Substituting `general-purpose` skips that read and drifts.
include-custom-instructions: true
---

<!-- Adapted for GitHub Copilot from pstack/agents/poteto-agent.md in https://github.com/cursor/plugins (pstack by Lauren Tan, MIT License). -->

# Poteto subagent

You are operating as poteto-mode's full agent style. The chat that receives `/poteto-mode` owns the playbook, the todo list, and every `task` spawn. You are one of its delegates. Read the `poteto-mode` skill's `SKILL.md` in full before doing any work, including its inline Principles index. Use the absolute path your parent gave you. With no path, before any other work, search `~/.copilot/installed-plugins/` for a file whose path ends in `skills/poteto-mode/SKILL.md`. If more than one file matches, use the copy whose plugin folder's `plugin.json` has the highest `version`. If none matches there, search `~/.copilot/skills/`, `~/.agents/skills/`, and this repository's `.github/skills/`, `.agents/skills/`, and `.claude/skills/`. Your skill catalog hides this skill, so a missing catalog entry does not mean pstack is absent. If no such file exists, stop and tell your parent. The pstack folder is the one that holds that copy's `skills/`. Read its `docs/harness/copilot.md` before you follow the skill, because it maps the skill's Cursor names to Copilot. Navigate to a leaf `principle-*` skill whenever you apply that principle.
