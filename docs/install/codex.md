# Install pstack in Codex

pstack is by Lauren Tan, published under the MIT License in [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack) and written for Cursor. This repository ports it. The skills keep their Cursor names, and Codex maps them with [the Codex adapter](../harness/codex.md), which each skill tells the model to read.

The Codex facts here were checked against the Codex source at commit `ea8ccc1d` (November 2026). Codex changes fast, so check the Known limits below if something behaves differently.

## 1. Install the skills

### Plugin (recommended)

```sh
codex plugin marketplace add brainfucknow/pstack-harness
codex plugin add pstack@pstack-harness
```

Codex copies the whole repository into `~/.codex/plugins/cache/pstack-harness/pstack/<version>/`, so `docs/` stays beside `skills/` and the adapter links resolve. The skills are listed as `pstack:<name>`, so you type `$pstack:poteto-mode`.

To update, run `codex plugin marketplace upgrade pstack-harness`, then `codex plugin add pstack@pstack-harness` again.

### Manual

Clone the whole repository into a user skills folder:

```sh
git clone https://github.com/brainfucknow/pstack-harness ~/.agents/skills/pstack-harness
```

Codex scans `~/.agents/skills/` recursively, so it finds `skills/<name>/SKILL.md` inside the clone. Each skill links to the adapter as `../../docs/harness/codex.md`, and inside the clone that path is real. Update with `git -C ~/.agents/skills/pstack-harness pull`.

Do not copy or symlink only `skills/` into `~/.agents/skills/`. A copy leaves `docs/` behind, so the adapter link points at `~/.agents/docs/`, which does not exist. A symlinked `skills/` folder breaks it too whenever the path is normalized as text, which is how a model usually reads a relative link: `~/.agents/skills/pstack/poteto-mode/../../docs` becomes `~/.agents/skills/docs`. The clone keeps the link true both ways.

For one project only, clone into `<repo>/.agents/skills/pstack-harness` instead.

## 2. Install the agent roles

Codex plugins cannot ship custom agents, so install the two roles by hand. Copy them; Codex refuses a role file that is a symlink.

```sh
mkdir -p ~/.codex/agents
# From a clone:
cp ~/.agents/skills/pstack-harness/harness/codex/agents/*.toml ~/.codex/agents/
# Or from the plugin cache:
cp ~/.codex/plugins/cache/pstack-harness/pstack/*/harness/codex/agents/*.toml ~/.codex/agents/
```

This adds the `poteto-agent` and `comment-sicko` roles. They set no model or effort, so pstack picks those per task. Re-copy them after an update. Without them, pstack falls back to a default agent that reads `agents/<name>.md` first.

## 3. Configure Codex

Add what you want to `~/.codex/config.toml`:

```toml
# Lets pstack keep its phase list in the plan tool. Off by default.
[tools.update_plan]
enabled = true

# Lets pstack ask multiple-choice questions outside Plan mode.
# Codex marks this flag as under development.
[features]
default_mode_request_user_input = true

# Subagents are on by default. This raises how many run at once
# (default: 3 with the V2 tools, 6 with V1).
[agents]
max_threads = 6
```

Without these, pstack still works. It keeps its phase list in the reply and asks questions in plain text.

## 4. Use it

1. Start a new Codex session and run `$setup-pstack` (`$pstack:setup-pstack` from the plugin). It reads the models `spawn_agent` offers, asks for a budget, and writes a marked block into `~/.codex/AGENTS.md` (or `AGENTS.override.md` if you use one). It edits only the lines between `<!-- pstack-models:begin -->` and `<!-- pstack-models:end -->`, and re-running it replaces that block in place.
2. Start another session so the block loads, then run `$poteto-mode` (`$pstack:poteto-mode`) with your task.

You can also type `$` in the composer, or run `/skills`, and pick from the list.

## Known limits

- One vendor. pstack's defaults name Claude, Gemini, and Grok models. Codex runs OpenAI models, so a Cursor slug becomes the session model at the slug's reasoning effort. Review panels and the cross-judge, which want three different vendors, use different Codex models or efforts instead, and say so in the reply. That is less diverse than upstream.
- No read-only subagents. A Codex subagent takes the parent's sandbox and approvals, and a role file cannot change that. pstack tells read-only agents not to edit and checks `git status` afterward.
- No per-subagent isolation. Cursor runs `environment: "cloud"` workers on their own machines. In Codex they share your checkout, so pstack tells each worker to make its own `git worktree`.
- No Cursor Automations, Bugbot, or Cursor cloud agents. Steps that need them are skipped with a `Skipped in Codex:` line. Bugbot comments already on a PR are still triaged. `/review` and `codex review` give a local review instead.
- The V2 subagent tools have no way to resume a closed agent. pstack spawns a fresh one with the earlier result.
- `request_user_input` works only in Plan mode unless you set the flag above, and `codex exec` rejects it. `update_plan` is off unless you enable it.
- Codex ignores pstack's `disable-model-invocation` frontmatter, so `poteto-mode` and other explicit-only skills can start when a task matches their description, not only when you name them.
- No per-workspace transcript folder. Skills that read past sessions (such as `recall` and `show-me-your-work`) search `~/.codex/sessions/` and keep only files whose recorded working directory is this workspace.
- Not verified against a running Codex: the minimum Codex version with these plugin commands, whether `codex plugin marketplace upgrade` alone refreshes an installed plugin (hence the second `codex plugin add`), and whether skills from a manual clone are listed with the `pstack:` prefix. If `$poteto-mode` does not match, try `$pstack:poteto-mode` or pick from `/skills`.
