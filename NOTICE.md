# Notice

## Origin

The skills, agents, guide, Claude Code adapter, and upstream README in this repository come from pstack by Lauren Tan ([poteto](https://github.com/poteto)).

- Source: https://github.com/cursor/plugins/tree/main/pstack
- Pinned commit: [`aaeb0ea3a0584995aa8f55ce44c6c5259414b896`](https://github.com/cursor/plugins/tree/aaeb0ea3a0584995aa8f55ce44c6c5259414b896/pstack) (see [upstream.json](upstream.json) for the current pin)
- License: MIT, Copyright (c) 2026 Lauren Tan. The full text is in [LICENSE](LICENSE), copied verbatim from [upstream](https://github.com/cursor/plugins/blob/main/pstack/LICENSE).

This repository is an unofficial port. It is not affiliated with or endorsed by Cursor.

## Modifications

`scripts/build.mjs` copies the upstream files and makes these changes:

- In each `SKILL.md` that uses Cursor names, it inserts one paragraph after the title. The paragraph tells the agent to read the adapter doc for its harness (Claude Code, Codex, or GitHub Copilot). Upstream inserts a similar sentence for Claude Code only.
- It rewrites relative links so they resolve in this repository's layout. Upstream's `README.md` moves to `docs/upstream-README.md`, so links to and from it change. Links to upstream files that this repository does not ship, such as `automations/`, point at those files on GitHub at the pinned commit.
- It copies the `version` from upstream's `plugin.json` into this repository's plugin manifests.

This repository also adds files that are not in upstream:

- Adapter docs for Codex and GitHub Copilot in `docs/harness/`.
- Install docs in `docs/install/`.
- Per-harness agent definitions in `harness/`.
- Plugin and marketplace manifests for Claude Code, Codex, and GitHub Copilot.
- `README.md`, this file, `upstream.json`, `scripts/build.mjs`, and CI.

## License of additions

The additions and modifications made by this repository are also released under the MIT License, Copyright (c) 2026 pstack-harness contributors, on the same terms as the text in [LICENSE](LICENSE).
