# pstack in GitHub Copilot

pstack skills use Cursor names. In GitHub Copilot, read this file once per session, then map each Cursor name in a skill with the tables below. The tables are for Copilot CLI and for the Copilot harness in VS Code, which runs the same agent runtime. Surfaces says where VS Code and the cloud coding agent differ. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects. When a row names a parameter that the tool schema does not list, use the row's fallback.

## Tools

| Cursor | Copilot |
| --- | --- |
| `Task` | `task`. Name the agent in `agent_type`. |
| `AskQuestion` | `ask_user`. When the session has no `ask_user`, such as under `--no-ask-user` or in the cloud coding agent, ask in plain text. |
| Open a todolist, or copy steps into the todolist tool | When the session lists the `sql` tool, insert one row per step into its `todos` table (`id`, `title`, `description`, `status`) and set `status` to `in_progress`, `done`, or `blocked` as you go. Else use the todo tool the session lists. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Call the `skill` tool with `<name>` when it lists that skill. When it does not list it or refuses it, `view` `<pstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type it, write `/<name>`. In VS Code with the plugin installed, write `/pstack:<name>`. |
| `Grep`, `Glob` | `grep`, `glob`. Use the shell with `rg` when the session has neither. |

## Subagent fields

| Cursor | Copilot |
| --- | --- |
| `subagent_type: generalPurpose` | `agent_type: "general-purpose"` |
| `poteto-agent`, `comment-sicko` | `agent_type: "poteto-agent"`, `agent_type: "comment-sicko"`. The pstack plugin ships both. When `task` rejects the name, spawn `general-purpose` and put this line in the brief: `Act as the agent defined in <pstack>/harness/copilot/agents/<name>.agent.md. Read it first.` |
| The `model:` line in `poteto-agent`'s file | Copilot's `poteto-agent` has no model line, so it runs on the session model unless the call names one. Pass the model and effort on every `task` call that spawns it, mapped with the Models table. |
| `readonly: true` | `agent_type: "explore"`. It answers in under 300 words and gets no repository instructions. The brief also says "do not edit files", and you check `git status` afterward. When the step needs a longer report, use `general-purpose` with the same brief line. |
| `readonly: false` | `general-purpose`. It gets the repository instructions. |
| `environment: "cloud"` | If the `task` schema lists a worktree or isolation field, use it. Otherwise the brief tells the worker to run `git worktree add` on a new branch from the named branch or commit, work only in that worktree, and report its path and branch. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to start its worktree from `<b>`. |
| `run_in_background: true` | `mode: "background"` when the `task` schema lists `mode`. Collect each result with `read_agent`. Otherwise omit it. |
| `resume` | When the agent ran with `mode: "background"` and `list_agents` still shows it, send the follow-up with `write_agent` to its `agent_id`. Otherwise spawn a new agent and paste the earlier result into its brief. |
| `file_attachments` | List the paths in the brief. |

## Models

Cursor slugs put the effort in the slug. Copilot model ids do not, so the effort goes in its own field.

| Cursor | Copilot |
| --- | --- |
| A slug such as `claude-opus-5-5-xhigh-fast` | Drop `-fast`. The last token is the effort. Join the two digits of a version with a dot. So `claude-opus-5-5-xhigh-fast` is model `claude-opus-5.5` at effort `xhigh`, `claude-fable-5-2-high` is `claude-fable-5.2` at `high`, and `gemini-4-neon-xhigh` is `gemini-4-neon` at `xhigh`. `grok-` and `gpt-` slugs convert the same way. |
| Passing the model | Pass `model` when the `task` schema lists it, and pass the effort in the schema's effort field when it lists one. Otherwise drop that value. If `task` rejects the id, or the user's plan does not offer that model, omit `model` so the agent runs on the session model, and say so. Never pass a rejected id again. |
| A panel of vendors | Copilot serves Anthropic, OpenAI, Google, and xAI models, so a panel keeps its vendors when the plan offers each seat's model. A seat whose model is not offered runs on the session model. Say which seat. |
| `auto` or `inherit-parent` | Omit `model`. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.copilot/instructions/pstack-models.instructions.md`, under `$COPILOT_HOME` instead of `~/.copilot` when that is set. Copilot loads it into every new session, so its role lines are already in context. If they are not, read the file. If the file or the role's line is missing, use the skill's default slug. A custom subagent does not load instruction files by default, so the parent always passes the role's model. |
| A role value `<model> <effort>`, such as `claude-opus-5.5 high` | `model: "claude-opus-5.5"` and effort `high`. |

## setup-pstack

Copilot loads every `*.instructions.md` file under `~/.copilot/instructions/` into each new session, in Copilot CLI and in VS Code's Copilot harness, so `setup-pstack` writes its rule there. Follow its steps with these changes:

- Detect. The detected models are the `model` values that the `task` schema lists. If it lists none, ask the user to run `/model` and paste the model ids their plan offers, with each one's effort levels. Write a real model as `<model> <effort>`, such as `claude-opus-5.5 xhigh`. The effort is the last token, so the budget step works as written. Copilot ids have no `-fast` form, so skip every rule about `-fast`.
- Load. Read `~/.copilot/instructions/pstack-models.instructions.md` as the current rule. Step 2's slug patterns match the Copilot form too, so `gemini-4-neon-high` means `gemini-4-neon high`.
- Defaults. Map each default slug with the rows above: `claude-opus-5-5-xhigh-fast` is `claude-opus-5.5 xhigh`, `claude-opus-5-5-high-fast` is `claude-opus-5.5 high`, `claude-fable-5-2-high` is `claude-fable-5.2 high`, and `gemini-4-neon-xhigh` is `gemini-4-neon xhigh`. A default whose model is not detected becomes `inherit-parent`. Tell the user which.
- Write. Write `~/.copilot/instructions/pstack-models.instructions.md`. Its frontmatter holds only `description: pstack per-role model choices (overrides skill defaults)`. Never add `applyTo`, because Copilot then loads the file only while it works on a matching file. Then write the comment lines, the `# defaults: 3` line, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Never put the role lines in `copilot-instructions.md` or `AGENTS.md`.

## Paths

| Cursor | Copilot |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.github/skills/`, `~/.copilot/skills/`. Copilot also reads `.agents/skills/` and `.claude/skills/` in a project and `~/.agents/skills/` at home. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `~/.copilot/installed-plugins/<marketplace>/<plugin>/`, so pstack is in `~/.copilot/installed-plugins/pstack-harness/pstack/`. Its manifest is `plugin.json`. |
| `.cursor/rules/*.mdc`, always-applied rules | `.github/copilot-instructions.md`, `AGENTS.md`, or `.github/instructions/*.instructions.md`. Copilot never reads `.mdc` files. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. The plugin ships the skills, `docs/guide/`, and `README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.copilot/session-state/<session-id>/events.jsonl`, one JSONL event log per session. The folders are keyed by session id, not by workspace. Find this workspace's sessions with `rg -l` for the workspace's absolute path across those files, and read only the matches. The newest match is the current session. |

## Surfaces

| Surface | Differences |
| --- | --- |
| Copilot CLI | Everything above applies. |
| VS Code, Copilot harness | Same runtime and same `task` tool. Users type plugin skills as `/pstack:<name>`. When a tool named above is missing, use the tool the session lists for the same job, or the row's fallback. |
| Cloud coding agent | It runs unattended on GitHub and reports through a pull request. It has no `ask_user` and no todo tool, so make the call yourself, state the assumption in the PR, and keep the list in your reply. If it has no `task` tool, do each subagent's work yourself in order and say so. It sees only the repository, so `~/.copilot/` paths do not exist there and the model rule never applies. |

## Cursor-only features

Copilot has no Cursor Automations, Bugbot, or Cursor cloud agents. When a step needs one, put one line in your reply, `Skipped in Copilot: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Copilot |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Copilot code review is the Copilot analogue, and its threads take the same triage. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. When a step only needs the work to run remotely and land as a PR, tell the user they can hand it to the cloud coding agent with `/delegate <prompt>`, adding `--base <branch>` for another base. You cannot run `/delegate` yourself. Skip a step that needs the Cursor cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
