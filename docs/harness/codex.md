# pstack in Codex

pstack skills use Cursor names. In Codex, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

Codex has two generations of subagent tools, chosen per model. V1 has `send_input`, `resume_agent`, and `close_agent`. V2 has `task_name`, `fork_turns`, `followup_task`, and `list_agents`. Use whichever tools your schema actually lists. Where the tables give both, the V1 name comes first.

## Tools

| Cursor | Codex |
| --- | --- |
| `Task` | `spawn_agent`. It returns at once with an id (V1 `agent_id`, V2 `task_name`). Call `wait_agent` when you need the result: V1 takes `targets`, V2 takes only `timeout_ms` and wakes on any agent's update. In V1, `close_agent` each agent once you have its result. |
| A fresh `Task` brief | V1: send `message` and leave `fork_context` unset. V2: send `task_name` (lowercase letters, digits, underscores), `message`, and `fork_turns: "none"`, because V2 copies your whole history by default. |
| `AskQuestion` | `request_user_input` when your schema lists it. It works only in Plan mode unless the user enabled it for Default mode, and `codex exec` rejects it. When it is absent or the call fails, ask in plain text with the same options and wait for the answer. |
| Open a todolist, or copy steps into the todolist tool | Use `update_plan` if the session offers it. It is off by default. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` with the shell and follow it. Never hand that read to a subagent. When you tell the user to type it, write the name your skill catalog lists: `$pstack:<name>` when pstack came from the plugin, else `$<name>`. |
| `Grep`, `Glob` | `exec_command` with `rg` or `rg --files`. Codex has no search tool. |
| File edits | `apply_patch` when the session offers it, else the shell. |

## Subagent fields

| Cursor | Codex |
| --- | --- |
| `subagent_type: generalPurpose` | `agent_type: "default"`, or omit `agent_type`. The schema lists `agent_type` only when the user has custom roles installed. |
| `poteto-agent`, `comment-sicko` | `agent_type: "poteto-agent"`, `agent_type: "comment-sicko"`. These roles come from `~/.codex/agents/`. When the schema has no `agent_type`, or the spawn fails with `unknown agent_type` or an unavailable role, spawn a default agent and make the first line of its brief `Read <pstack>/agents/<name>.md and act as that agent.` Never forward that file's `model:` line. |
| The `model:` line in `poteto-agent`'s file | The Codex role files set no model or effort, so pass `reasoning_effort` (and `model` when the Models table gives one) on every spawn of `poteto-agent`. A role that set its own effort would override yours. |
| `readonly: true` | No spawn field makes an agent read-only. Subagents take your sandbox and approvals. Put "do not edit files" in the brief, and check `git status` afterward. |
| `readonly: false` | Omit. |
| `environment: "cloud"` | Codex has no per-agent isolation, and parallel agents share your checkout. Tell the worker to run `git worktree add <dir> -b <branch> <base>` first and to work only in `<dir>`. Name the branch, the base, and the folder in the brief. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Use `<b>` as the worktree base. |
| `run_in_background: true` | Omit. `spawn_agent` never blocks. |
| `resume` | V1: `send_input` to an open agent, or `resume_agent` then `send_input` for a closed one. V2: `followup_task` to a live agent. When the agent is gone, spawn a new one and paste the earlier result into its brief. |
| `file_attachments` | List the paths in the brief. |
| Spawn many agents in one message | V2 runs 3 subagents at once by default (`features.multi_agent_v2.max_concurrent_threads_per_session` minus 1 for the root, default 4). V1 runs 6 (`[agents] max_threads`). The user raises the key for the generation in use. The V2 key wins when both are set. When a step needs more, run the rest as earlier ones finish, and say so. |

## Models

Every model Codex offers comes from one vendor. The models you may pass are the ones the `spawn_agent` description lists, each with its reasoning efforts. When that list is hidden, use the latest `<model_catalog>`. A rejected `model` answers with the valid list. Never pass a rejected value again. When `spawn_agent` has no `model` or `reasoning_effort` field, omit it and say so.

| Cursor | Codex |
| --- | --- |
| `claude-<family>-<version>-<effort>[-fast]`, such as `claude-opus-5-5-xhigh-fast` | Omit `model` so the agent runs on the session model, and pass `reasoning_effort: "<effort>"`, such as `xhigh`. Drop `-fast`. |
| `gpt-<version>-<effort>`, a Cursor GPT slug | Drop the effort token. If what is left is a listed model, pass it as `model` with that `reasoning_effort`. Otherwise omit `model` and pass only the effort. |
| A `gemini-*`, `grok-*`, or other slug | Omit `model`, pass the slug's effort when it names one, and say so. |
| `auto` or `inherit-parent` | Omit `model` and `reasoning_effort`, and use `agent_type: "default"` or omit it. |
| An effort the model does not list | Use the highest listed effort below it. pstack never runs above `xhigh`, even where Codex offers `max` or `ultra`. |
| A role value `<model> <effort>`, such as `gpt-5.5 high` | `model: "gpt-5.5"` and `reasoning_effort: "high"`. |
| A role value of one effort, such as `xhigh` | Omit `model`, and pass `reasoning_effort: "xhigh"`. |
| Another vendor's model: a panel seat, the cross-judge, a second opinion | Use a listed model other than the one that did the work, else the same model at another effort. Fill each panel seat with a different model or effort. Say in the reply that the panel or judge stayed on one vendor. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | The pstack-models block in the global instructions file. See setup-pstack. Codex loads that file into every session, so the role lines are already in context. If they are not, read the file. If the block or the role's line is missing, use the skill's default mapped with this table. |

## setup-pstack

Codex has no always-loaded rules directory. `$CODEX_HOME/rules/` holds command-approval rules, not prompt text, so never write there. `setup-pstack` writes its lines into the global instructions file instead. That file is `$CODEX_HOME/AGENTS.override.md` when it exists, else `$CODEX_HOME/AGENTS.md`. `$CODEX_HOME` defaults to `~/.codex`. The file belongs to the user, so `setup-pstack` owns only the lines between its markers. Follow its steps with these changes:

- Detect. The detected models are the ones the `spawn_agent` description lists, each with its listed efforts. Write a real model as `<model> <effort>`, such as `gpt-5.5 xhigh`. Write a role that runs on the session model as its effort alone, such as `xhigh`. The effort is the last token, so the budget step works as written. There is no `-fast` token.
- Load. The current state is the block between the markers. Step 2's rules about old Cursor slugs apply only to a block that still holds Cursor slugs.
- Defaults. Map each default slug with the Models rows: `claude-opus-5-5-xhigh-fast` is `xhigh` and `claude-opus-5-5-high-fast` is `high`. A panel list (`arena runners`, `interrogate reviewers`) takes the first three detected models in listed order as `<first> high, <second> high, <third> xhigh`. With fewer models, fill the empty seats with effort-only values so no two seats match. `arena cross-judge pool` takes the first two detected models at `high`.
- Validate. Every model written is in the detected list with that effort, at `xhigh` or below. An effort-only value is an effort the session model lists.
- Write. Build the block from step 5's shape without its frontmatter: a begin line, a fenced `text` block holding the comment lines, the `# defaults: 3` line, the `# budget` line, and one line per role, then an end line.

  ````
  <!-- pstack-models:begin -->
  ```text
  # pstack model configuration. One line per role. Delete a line to fall back to the skill default.
  ...
  ```
  <!-- pstack-models:end -->
  ````

  If the file has exactly one begin line and one end line after it, replace those lines and everything between them with the new block. If it has neither, append a blank line and the block. If the file does not exist, create it with only the block. In any other case, such as one marker alone or two begin lines, change nothing, show the user the marker lines, and ask. Never edit outside the markers, and never put the role lines in a project `AGENTS.md`.

## Paths

| Cursor | Codex |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.agents/skills/` in any folder from the project root down to the working directory, `.codex/skills/`, and `~/.agents/skills/`. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `$CODEX_HOME/plugins/cache/<marketplace>/<plugin>/<version>/`, `.codex-plugin/plugin.json`. pstack installs as `$CODEX_HOME/plugins/cache/pstack-harness/pstack/<version>/`. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or `AGENTS.override.md` where it exists, in each folder from the project root down to the working directory, plus the global `$CODEX_HOME/AGENTS.md`. Codex never reads `.mdc` files. The model rule is the setup-pstack block. |
| Agent definitions in `agents/*.md` | Role files in `~/.codex/agents/*.toml` or `<repo>/.codex/agents/*.toml`. A plugin cannot ship roles. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. The upstream `README.md` is `<pstack>/docs/upstream-README.md`. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-<time>-<thread id>.jsonl`, dated in local time. Older files may be compressed to `.jsonl.zst`, so read those with `zstd -dc`. There is no folder per workspace. The first line is a `session_meta` record, and its `payload.cwd` names the workspace, so read only files whose `cwd` is this workspace. In `exec_command`, `$CODEX_THREAD_ID` is the current thread, so the current session's file name contains it. Each subagent writes its own rollout file in the same tree, and its `payload.parent_thread_id` is the thread that spawned it. Archived sessions sit in `$CODEX_HOME/archived_sessions/`. |

## Cursor-only features

Codex has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Codex: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Codex |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment, and tell the user that `/review` or `codex review --base <branch>` runs a local review. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
