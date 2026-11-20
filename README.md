# pstack-harness

This repository packages pstack so you can install it in Claude Code, OpenAI Codex, and GitHub Copilot.

The skills, agents, and guide are the work of Lauren Tan ([poteto](https://github.com/poteto)). They come from [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack), pinned to commit [`aaeb0ea`](https://github.com/cursor/plugins/tree/aaeb0ea3a0584995aa8f55ce44c6c5259414b896/pstack), and are MIT licensed. See the [upstream license](https://github.com/cursor/plugins/blob/main/pstack/LICENSE), this repository's [LICENSE](LICENSE), and [NOTICE.md](NOTICE.md) for what this repository changes.

This is an unofficial port. It is not affiliated with or endorsed by Cursor.

## Install

### Claude Code

```
/plugin marketplace add brainfucknow/pstack-harness
/plugin install pstack@pstack-harness
```

Skills appear as `/pstack:<name>`. Start with `/pstack:setup-pstack` to choose your models, then use `/pstack:poteto-mode` for any task that needs rigor.

### Codex

Codex reads the same skills through its own plugin manifest. See [docs/install/codex.md](docs/install/codex.md).

### GitHub Copilot

Copilot reads the same skills through its own plugin manifest. See [docs/install/copilot.md](docs/install/copilot.md).

## How it works

pstack skills are written for Cursor and use Cursor names for tools, subagent fields, models, and paths. Upstream solves this for Claude Code with an adapter doc that maps each Cursor name, and a line in each affected `SKILL.md` that tells the agent to read it. This repository applies the same idea to three harnesses with one shared tree at the repository root:

- `skills/` and `agents/` are shared by every harness.
- Each harness has one adapter doc in `docs/harness/`: [claude-code.md](docs/harness/claude-code.md) (from upstream), [codex.md](docs/harness/codex.md), and [copilot.md](docs/harness/copilot.md).
- Each `SKILL.md` that uses Cursor names gets one paragraph after its title that links all three adapters.
- Claude Code reads `.claude-plugin/` and uses `agents/` as is. The Codex and Copilot manifests and agent definitions live elsewhere: Codex reads `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, and the roles in `harness/codex/agents/`. Copilot reads the root `plugin.json` and the agents in `harness/copilot/agents/`.

`scripts/build.mjs` generates these paths from the pinned upstream commit. Do not edit them by hand:

- `skills/`, `agents/`, `docs/guide/`, `docs/harness/claude-code.md`
- `docs/upstream-README.md` (upstream's README)
- `LICENSE` (upstream's license)
- the `version` field in `upstream.json` and in each plugin manifest

Everything else is hand-written. The script rewrites relative links so they resolve in this layout. A link to an upstream file this repository does not ship, such as `automations/`, points at that file on GitHub at the pinned commit.

The script also fails when a skill uses a Cursor name that an adapter doc has no row for, so a new upstream term cannot slip through unmapped.

## Update from upstream

The pin lives in [upstream.json](upstream.json). To move it:

```
node scripts/build.mjs --bump <commit-sha>
```

This fetches that commit of `cursor/plugins`, regenerates the tree, and writes the new commit and version to `upstream.json`. You can also edit `commit` in `upstream.json` by hand and run `node scripts/build.mjs`. Review the diff, add rows to the adapter docs for any new Cursor names the script reports, and commit.

Other options:

- `node scripts/build.mjs --check` lists drift and exits non-zero without writing. CI runs it on every push and pull request.
- `--upstream <dir>` uses an existing checkout of `cursor/plugins` instead of fetching. Its `HEAD` must match the pin unless you pass `--allow-dirty-upstream`.

Without `--upstream`, the script does a shallow git fetch of the pinned commit into a cache directory under your OS temp directory. It needs Node 20 or later and git.

## Usage

Read [docs/upstream-README.md](docs/upstream-README.md) for what pstack is and how to use it, and the [pstack guide](docs/guide/README.md) for a walkthrough of a first real task. Both are written for Cursor. Your harness's adapter doc covers the differences.
