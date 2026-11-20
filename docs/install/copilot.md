# Install pstack in GitHub Copilot

pstack is by Lauren Tan, published under the MIT License at [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack). This repository ports it so the same skills run in GitHub Copilot. The skills keep their Cursor names. The [Copilot adapter](../harness/copilot.md) maps those names to Copilot, and each skill tells the model to read it.

The Copilot route installs three things: the skills in `skills/`, the adapter and guide in `docs/`, and two custom agents, `poteto-agent` and `comment-sicko`, from `harness/copilot/agents/`.

## Copilot CLI (recommended)

```shell
copilot plugin marketplace add brainfucknow/pstack-harness
copilot plugin install pstack@pstack-harness
```

Inside a session, `/plugin marketplace add brainfucknow/pstack-harness` and `/plugin install pstack@pstack-harness` do the same. The plugin is the repository root, installed at `~/.copilot/installed-plugins/pstack-harness/pstack/`, so the skills' links to `docs/` keep working. Update with `copilot plugin update pstack`.

The repository's root `plugin.json` is the Copilot manifest. Copilot CLI reads it before `.claude-plugin/plugin.json`, which serves Claude Code. It points `agents` at `harness/copilot/agents/` and `skills` at `skills/`.

## VS Code

Use the Copilot harness, which shares Copilot CLI's runtime, and turn on `chat.plugins.enabled`. Then pick one:

- Install with the CLI commands above. VS Code finds plugins in `~/.copilot/installed-plugins/` on its own.
- Run **Chat: Open Customizations**, open the source menu, select **Configure Marketplaces**, add `brainfucknow/pstack-harness`, and install `pstack`.
- Open `vscode://chat-plugin/add-marketplace?ref=brainfucknow%2Fpstack-harness`.

## Manual install

Clone the repository and keep the clone. Each skill links to `../../docs/harness/copilot.md`, so `docs/` must stay two folders above every `SKILL.md`. Copying only `skills/` into `~/.copilot/skills/` breaks that link.

For your own sessions, point Copilot at the clone's `skills/` folder and copy the agents:

```shell
git clone https://github.com/brainfucknow/pstack-harness ~/src/pstack-harness
mkdir -p ~/.copilot/agents
cp ~/src/pstack-harness/harness/copilot/agents/*.agent.md ~/.copilot/agents/
```

Then run `/skills add ~/src/pstack-harness/skills` in a session, or list that folder in `COPILOT_SKILLS_DIRS`.

For one repository, copy `skills/` to `.github/skills/`, `docs/` to `.github/docs/`, and the agent files to `.github/agents/`. The links then resolve inside `.github/`.

## Cloud coding agent

The cloud coding agent sees only the repository. Give it pstack in one of two ways:

- Commit the per-repository copy from Manual install.
- Enable the plugin in `.github/copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "pstack-harness": {
      "source": { "source": "github", "repo": "brainfucknow/pstack-harness" }
    }
  },
  "enabledPlugins": {
    "pstack@pstack-harness": true
  }
}
```

It runs unattended and answers through a pull request. It cannot ask you questions, has no todo tool, and has no home folder, so `/setup-pstack` has nothing to write there and the skills use their default models.

## Use it

1. Run `/setup-pstack` once. It finds the models your plan offers and writes your per-role choices to `~/.copilot/instructions/pstack-models.instructions.md`, which Copilot loads in each new session.
2. Start work with `/poteto-mode <task>`.

In Copilot CLI the bare names work. If another plugin also has a skill with that name, type `/pstack/setup-pstack` and `/pstack/poteto-mode`. In VS Code, plugin skills carry the plugin prefix: `/pstack:setup-pstack` and `/pstack:poteto-mode`.

## Known limits

- The `task` tool's documented parameters are `agent_type` and `mode: "background"`. Copilot documents a per-call model and effort but not their parameter names, and no per-subagent worktree option. The adapter passes them only when the tool schema lists them. Otherwise the subagent runs on the session model and a worktree is made with `git worktree add`.
- Copilot model ids carry no effort and have no `-fast` form. The ids `claude-fable-5.2`, `gemini-4-neon`, and the Grok ids are inferred from Copilot's model names. Copilot CLI's docs list `claude-opus-5.5` itself. Each seat of the review panel runs only if your plan offers its model. Otherwise that seat runs on the session model.
- Without `applyTo`, the models file should load in every session. That is inferred from the docs, which say only that `applyTo` limits a file to matching files. If the role lines are missing from context, the adapter tells the model to read the file. Custom subagents do not get instruction files by default, so the parent passes each model.
- Plugin agents have no plugin prefix. A user or project agent with the ID `poteto-agent` or `comment-sicko` replaces the plugin's.
- VS Code documents both `plugin.json` and `.claude-plugin/plugin.json` as plugin formats but not which one wins when both exist. If it picks the Claude manifest, it loads the Claude Code agents from `agents/`, whose `model` line holds a Cursor slug. VS Code also does not pass `include-custom-instructions` on to plugin agents.
- The agent files set `include-custom-instructions: true`, which brings repository instruction files to the subagent. Whether it also brings `~/.copilot/instructions/` is not documented.
- The `explore` agent is described as read-only, but the docs do not say it is enforced. It answers in under 300 words.
- `ask_user`, the `sql` todo table, and the `skill` tool are documented for Copilot CLI. Their names in VS Code's Copilot harness and in the cloud coding agent are not, so the adapter gives a fallback for each.
- Unattended runs should pass `--no-ask-user` to `copilot -p`. The model then asks in plain text.
- Session transcripts sit in `~/.copilot/session-state/<session-id>/events.jsonl`. Their event format is not documented, and finding a workspace's sessions by searching for its path is inferred.
- Cursor Automations and Cursor cloud agents do not exist in Copilot, so those steps are skipped. Only you can hand work to the cloud coding agent, with `/delegate`. Bugbot steps run only when the PR has Bugbot comments. Copilot code review is the nearest match but is not the same product.
