#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND = "node scripts/build.mjs";
const LINK = /\]\(([^)\s]+)\)/g;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_KEY = "Run another pstack skill";

// Upstream path inside pstack/ -> path in this repository.
const SHIPPED = [
  ["skills", "skills"],
  ["agents", "agents"],
  ["docs/guide", "docs/guide"],
  ["docs/harness/claude-code.md", "docs/harness/claude-code.md"],
  ["README.md", "docs/upstream-README.md"],
  ["LICENSE", "LICENSE"],
];
const README_SENTENCE = "The plugin ships the skills, `docs/guide/`, and `README.md`.";
const README_REPLACEMENT = "The plugin ships the skills and `docs/guide/`. The upstream `README.md` is `<pstack>/docs/upstream-README.md`.";
// Hand-ported from these upstream agents, so a change upstream needs a re-port.
const AGENT_PORTS = {
  "comment-sicko.md": ["harness/codex/agents/comment-sicko.toml", "harness/copilot/agents/comment-sicko.agent.md"],
  "poteto-agent.md": ["harness/codex/agents/poteto-agent.toml", "harness/copilot/agents/poteto-agent.agent.md"],
};
const GENERATED = SHIPPED.map(([, to]) => to);
const MANIFESTS = [".claude-plugin/plugin.json", ".codex-plugin/plugin.json", "plugin.json", "upstream.json"];
const ADAPTERS = [
  { name: "Claude Code", path: "docs/harness/claude-code.md", generated: true },
  { name: "Codex", path: "docs/harness/codex.md" },
  { name: "GitHub Copilot", path: "docs/harness/copilot.md" },
];
const ADAPTER_PARAGRAPH =
  "Outside Cursor, read your harness adapter once per session: " +
  ADAPTERS.map(({ name, path }) => `[${name}](../../${path})`).join(", ") +
  ".";

const TERMS = [
  { key: "`Task`", re: /`Task`|\bTask (tool|subagent|call)/ },
  { key: "`AskQuestion`", re: /AskQuestion/ },
  { key: "todolist", re: /\btodo ?list\b/i },
  { key: "generalPurpose", re: /generalPurpose/ },
  { key: "poteto-agent", re: /poteto-agent/ },
  { key: "comment-sicko", re: /comment-sicko/ },
  { key: "`readonly: true`", re: /readonly: (true|false)|readonly\/Ask/ },
  { key: "`environment: \"cloud\"`", re: /environment: "(cloud|local)"/ },
  { key: "cloud_base_branch", re: /cloud_base_branch/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "`resume`", re: /`resume`/ },
  { key: "`file_attachments`", re: /file_attachments/ },
  { key: "claude-", re: /\bclaude-[a-z]+-\d/ },
  { key: "grok-", re: /\bgrok-\d/ },
  { key: "gpt-", re: /\bgpt-\d/ },
  { key: "gemini-", re: /\bgemini-\d/ },
  { key: "inherit-parent", re: /inherit-parent/ },
  { key: "pstack-models.mdc", re: /pstack-models\.mdc/ },
  { key: ".cursor/skills/", re: /\.cursor\/skills/ },
  { key: "~/.cursor/plugins/", re: /\.cursor\/plugins|\.cursor-plugin/ },
  { key: ".cursor/rules/", re: /\.cursor\/rules|always-applied rule/ },
  { key: "agent-transcripts", re: /agent-transcripts|\.cursor\/projects/ },
  { key: "Cursor-only features", re: /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool/ },
];

function parseArgs(argv) {
  const args = { check: false, upstream: undefined, bump: undefined, allowDirtyUpstream: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") args.check = true;
    else if (arg === "--allow-dirty-upstream") args.allowDirtyUpstream = true;
    else if (arg === "--upstream" || arg === "--bump") {
      if (!argv[i + 1]) fail(`${arg} needs a value`);
      args[arg.slice(2)] = argv[++i];
    } else fail(`unknown argument ${arg}. Usage: ${COMMAND} [--check] [--upstream <dir>] [--allow-dirty-upstream] [--bump <sha>]`);
  }
  return args;
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fetchUpstream({ repository, commit }) {
  const cache = join(tmpdir(), "pstack-harness-upstream", commit);
  if (existsSync(join(cache, ".git")) && git(cache, "rev-parse", "HEAD") === commit) return cache;
  rmSync(cache, { recursive: true, force: true });
  mkdirSync(cache, { recursive: true });
  git(cache, "init", "--quiet");
  git(cache, "remote", "add", "origin", repository);
  console.log(`Fetching ${repository} at ${commit} into ${cache}`);
  try {
    git(cache, "fetch", "--quiet", "--depth", "1", "origin", commit);
  } catch {
    console.log("Shallow fetch by commit failed, fetching full history instead.");
    git(cache, "fetch", "--quiet", "--filter=blob:none", "origin");
  }
  git(cache, "-c", "advice.detachedHead=false", "checkout", "--quiet", "--detach", commit);
  return cache;
}

function checkoutUpstream(dir, { commit, path }, allowDirty) {
  if (allowDirty) return dir;
  let head;
  try {
    head = git(dir, "rev-parse", "HEAD");
  } catch {
    fail(`${dir} is not a git checkout. Pass --allow-dirty-upstream to use it anyway.`);
  }
  if (head !== commit) fail(`${dir} is at ${head}, but upstream.json pins ${commit}. Pass --allow-dirty-upstream to use it anyway.`);
  if (git(dir, "status", "--porcelain", "--", path)) fail(`${dir}/${path} has uncommitted changes. Pass --allow-dirty-upstream to use it anyway.`);
  return dir;
}

function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      if (name === ".DS_Store" || name === "node_modules") return [];
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

function shippedPath(pstackPath) {
  for (const [from, to] of SHIPPED) {
    if (pstackPath === from || pstackPath.startsWith(`${from}/`)) return to + pstackPath.slice(from.length);
  }
  return undefined;
}

function classifySkills(skillsDir) {
  const skills = readdirSync(skillsDir).filter((name) => existsSync(join(skillsDir, name, "SKILL.md"))).sort();
  const problems = [];
  const users = new Map();
  const wrapped = new Set();
  for (const skill of skills) {
    const dir = join(skillsDir, skill);
    const others = skills.filter((name) => name !== skill).join("|");
    const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
    const linksToSkill = (line, name) => line.includes(`(../${name}/`);
    const namesBareSkill = (line) =>
      [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
    const usesCursorNames = new Set();
    for (const path of walk(dir).filter((path) => path.endsWith(".md"))) {
      const text = readFileSync(path, "utf8");
      for (const term of TERMS) if (term.re.test(text)) usesCursorNames.add(term.key);
      if (text.split("\n").some(namesBareSkill)) usesCursorNames.add(ROUTE_KEY);
    }
    const text = readFileSync(join(dir, "SKILL.md"), "utf8");
    const hasH1 = /^# /m.test(text);
    if (usesCursorNames.size > 0 && hasH1) wrapped.add(skill);
    if (usesCursorNames.size > 0 && !hasH1) problems.push(`skills/${skill}/SKILL.md uses Cursor names but has no H1`);
    for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), skill]);
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name !== skill) problems.push(`skills/${skill}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
    if (!SKILL_NAME.test(skill) || skill.length > 64) problems.push(`skills/${skill} is not lowercase words joined by hyphens, at most 64 characters`);
  }
  return { skills, wrapped, users, problems };
}

function checkAdapters(pstack, users) {
  const failures = [];
  const pending = [];
  for (const adapter of ADAPTERS) {
    const path = adapter.generated ? join(pstack, "docs/harness/claude-code.md") : join(ROOT, adapter.path);
    const list = adapter.generated ? failures : pending;
    if (!existsSync(path)) {
      list.push(`${adapter.path} is missing`);
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const [key, using] of users) {
      if (!text.includes(key)) list.push(`${adapter.path} has no row for ${key}, used by ${using.join(", ")}`);
    }
  }
  return { failures, pending };
}

function render(pstack, upstream, wrapped) {
  const sources = SHIPPED.flatMap(([from]) => {
    const path = join(pstack, from);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  const files = new Map();
  for (const source of sources) {
    const from = relative(pstack, source).split("\\").join("/");
    files.set(shippedPath(from), { from, ...file(source) });
  }
  const adapter = files.get("docs/harness/claude-code.md");
  const adapterText = adapter.bytes.toString("utf8");
  if (adapterText.split(README_SENTENCE).length !== 2) {
    fail(`docs/harness/claude-code.md no longer has the sentence "${README_SENTENCE}" exactly once. Update README_SENTENCE in ${COMMAND}.`);
  }
  adapter.bytes = Buffer.from(adapterText.replace(README_SENTENCE, () => README_REPLACEMENT));
  for (const skill of wrapped) {
    const entry = files.get(`skills/${skill}/SKILL.md`);
    entry.bytes = Buffer.from(entry.bytes.toString("utf8").replace(/^(# .*)\n+/m, `$1\n\n${ADAPTER_PARAGRAPH}\n\n`));
  }
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    entry.bytes = Buffer.from(
      entry.bytes.toString("utf8").replace(LINK, (link, href) => {
        const target = resolveUpstream(pstack, entry.from, href);
        if (!target || target.split("/")[0] === "..") return link;
        const suffix = href.slice(href.search(/[#?]|$/));
        const shipped = shippedPath(target);
        if (shipped) {
          if (posix.join(posix.dirname(path), stripSuffix(href)).replace(/\/$/, "") === shipped) return link;
          const slash = stripSuffix(href).endsWith("/") ? "/" : "";
          return `](${posix.relative(posix.dirname(path), shipped)}${slash}${suffix})`;
        }
        const kind = statSync(join(pstack, target)).isDirectory() ? "tree" : "blob";
        return `](${upstream.repository}/${kind}/${upstream.commit}/${upstream.path}/${target}${suffix})`;
      }),
    );
  }
  return files;
}

function stripSuffix(href) {
  return href.replace(/[#?].*/, "");
}

function isRelative(href) {
  const target = stripSuffix(href);
  return Boolean(target) && !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("/");
}

function resolveUpstream(pstack, from, href) {
  if (!isRelative(href)) return undefined;
  const path = posix.join(posix.dirname(from), stripSuffix(href)).replace(/\/$/, "");
  return existsSync(join(pstack, path)) ? path : undefined;
}

function danglingLinks(pstack, files) {
  const inTree = (path) => files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
  const adapterPaths = new Set(ADAPTERS.map(({ path }) => path));
  const dangling = [];
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK)) {
      if (!isRelative(href)) continue;
      const target = posix.join(posix.dirname(path), stripSuffix(href)).replace(/\/$/, "");
      if (inTree(target) || adapterPaths.has(target)) continue;
      if (resolveUpstream(pstack, entry.from, href) || target.split("/")[0] === "..") {
        dangling.push(`${path} links to ${href}, which is not in this repository`);
      }
    }
  }
  return dangling;
}

function agentHashes(pstack) {
  const dir = join(pstack, "agents");
  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => [name, createHash("sha256").update(readFileSync(join(dir, name))).digest("hex")]),
  );
}

function changedAgents(recorded, current) {
  return Object.keys({ ...recorded, ...current })
    .sort()
    .filter((name) => recorded?.[name] !== current[name])
    .map((name) => {
      const [codex, copilot] = AGENT_PORTS[name] ?? ["its Codex role", "its Copilot agent"];
      return `upstream agents/${name} changed: re-port ${codex} and ${copilot}`;
    });
}

function syncManifests(version) {
  const updates = new Map();
  for (const manifest of MANIFESTS) {
    const path = join(ROOT, manifest);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const json = JSON.parse(text);
    if (json.version === version) continue;
    const next =
      "version" in json
        ? text.replace(/("version"\s*:\s*)"[^"]*"/, `$1${JSON.stringify(version)}`)
        : `${JSON.stringify({ ...json, version }, null, 2)}\n`;
    updates.set(manifest, next);
  }
  return updates;
}

function generatedOnDisk() {
  const onDisk = new Map();
  for (const path of GENERATED) {
    const full = join(ROOT, path);
    if (!existsSync(full)) continue;
    const paths = statSync(full).isDirectory() ? walk(full) : [full];
    for (const p of paths) onDisk.set(relative(ROOT, p).split("\\").join("/"), file(p));
  }
  return onDisk;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const upstream = JSON.parse(readFileSync(join(ROOT, "upstream.json"), "utf8"));
  if (args.bump) upstream.commit = args.bump;
  const checkout = args.upstream
    ? checkoutUpstream(args.upstream, upstream, args.allowDirtyUpstream)
    : fetchUpstream(upstream);
  const pstack = join(checkout, upstream.path);
  if (!existsSync(join(pstack, "plugin.json"))) fail(`${pstack}/plugin.json does not exist`);
  const { version } = JSON.parse(readFileSync(join(pstack, "plugin.json"), "utf8"));

  const { skills, wrapped, users, problems } = classifySkills(join(pstack, "skills"));
  const adapters = checkAdapters(pstack, users);
  problems.push(...adapters.failures);
  const files = render(pstack, upstream, wrapped);
  problems.push(...danglingLinks(pstack, files));
  for (const problem of problems) console.log(`FAIL ${problem}`);
  if (problems.length > 0) process.exit(1);

  const agents = agentHashes(pstack);
  const agentChanges = upstream.agents ? changedAgents(upstream.agents, agents) : [];
  for (const message of agentChanges) console.log(`${args.check ? "FAIL" : "WARN"} ${message}`);
  const manifestUpdates = syncManifests(version);
  if (args.bump || !upstream.agents) {
    const pin = { ...JSON.parse(readFileSync(join(ROOT, "upstream.json"), "utf8")), commit: upstream.commit, version, agents };
    manifestUpdates.set("upstream.json", `${JSON.stringify(pin, null, 2)}\n`);
  }

  if (args.check) {
    const onDisk = generatedOnDisk();
    const drifted = [...new Set([...files.keys(), ...onDisk.keys()])].sort().filter((path) => {
      const [want, have] = [files.get(path), onDisk.get(path)];
      return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
    });
    drifted.push(...[...manifestUpdates.keys()].map((path) => `${path} (not synced with upstream)`));
    for (const path of drifted.slice(0, 50)) console.log(`DRIFT ${path}`);
    if (drifted.length > 50) console.log(`... and ${drifted.length - 50} more`);
    for (const message of adapters.pending) console.log(`FAIL ${message}`);
    if (drifted.length > 0) console.log(`Generated files are out of date. Run \`${COMMAND}\` and commit the result.`);
    if (drifted.length > 0 || adapters.pending.length > 0 || agentChanges.length > 0) process.exit(1);
    console.log("Generated files are up to date.");
    return;
  }

  for (const path of GENERATED) rmSync(join(ROOT, path), { recursive: true, force: true });
  for (const [path, { bytes, executable }] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), bytes);
    chmodSync(join(ROOT, path), executable ? 0o755 : 0o644);
  }
  for (const [path, text] of manifestUpdates) writeFileSync(join(ROOT, path), text);
  for (const message of adapters.pending) console.log(`WARN ${message}`);
  console.log(`pstack ${version} at ${upstream.commit}: ${skills.length} skills, ${wrapped.size} SKILL.md files with the adapter paragraph`);
}

main();
